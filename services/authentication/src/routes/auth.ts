import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { roleMap, issueTokens, verifyRefreshToken, issuePendingTwoFaToken, verifyPendingTwoFaToken } from '../lib/tokens';
import { requireAuth, requirePermission } from '@pospe/permissions';

const router = Router();

const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const pinLoginInput = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
  // The store this terminal was paired with (see POS pairing). PINs are only
  // matched against that store's staff — never across every tenant.
  storeId: z.string().min(1, 'This terminal is not paired with a store'),
});

const refreshInput = z.object({
  refreshToken: z.string().min(1),
});

// With the device's refresh token, only that session ends; without it (or
// with all: true) every session for the user ends, as before.
const logoutInput = z.object({
  refreshToken: z.string().min(1).optional(),
  all: z.boolean().optional(),
});

const twoFaVerifyInput = z.object({
  pendingToken: z.string().min(1),
  token: z.string().length(6),
});

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;
const BLOCKED_TENANT_STATUSES = new Set(['SUSPENDED', 'CANCELLED']);

const userRelations = {
  rbacRole: { select: { id: true, title: true, code: true, permissions: true } },
  tenant: { select: { id: true, name: true, slug: true, status: true } },
} as const;

type UserWithRelations = NonNullable<Awaited<ReturnType<typeof findUserById>>>;

function findUserById(id: string) {
  return prisma.user.findFirst({ where: { id }, include: userRelations });
}

// The store a freshly signed-in user acts on by default: their assigned
// store, else the tenant's primary store. POS terminals pair with this.
async function defaultStoreId(user: { storeId: string | null; tenantId: string }) {
  if (user.storeId) return user.storeId;
  const store = await prisma.store.findFirst({ where: { tenantId: user.tenantId, isPrimary: true }, select: { id: true } });
  return store?.id ?? null;
}

// The exact same shape every login-family route returns.
export async function serializeUser(user: UserWithRelations) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: roleMap[user.role] ?? 'cashier',
    tenantId: user.tenantId,
    tenantName: user.tenant.name,
    tenantStatus: user.tenant.status,
    storeId: await defaultStoreId(user),
    rbacRole: user.rbacRole ? { id: user.rbacRole.id, title: user.rbacRole.title, code: user.rbacRole.code } : null,
  };
}

/**
 * Account-level gates every login path shares. Returns an error response
 * (already sent) or null when the user may proceed.
 */
function rejectIfBlocked(user: UserWithRelations, res: Response): Response | null {
  if (!user.isActive) return res.status(403).json({ error: 'This account has been deactivated' });
  if (BLOCKED_TENANT_STATUSES.has(user.tenant.status)) {
    return res.status(403).json({ error: 'This business account is suspended. Contact support to restore access.', tenantStatus: user.tenant.status });
  }
  if (!user.emailVerifiedAt) {
    return res.status(403).json({ error: 'Please verify your email address first', requiresEmailVerification: true, email: user.email });
  }
  return null;
}

async function completeLogin(req: Request, res: Response, user: UserWithRelations, via: string) {
  const tokens = issueTokens(user);
  if (!tokens) return res.status(500).json({ error: 'Server auth configuration is missing JWT secrets' });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastActivityAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
  });
  await logAudit(user.tenantId, user.name, 'LOGIN_SUCCESS', `${user.name} authenticated successfully${via}`, 'LOW', req.ip);
  return res.json({ ...tokens, user: await serializeUser(user) });
}

async function recordFailedLogin(req: Request, user: UserWithRelations, detail: string) {
  const attempts = user.failedLoginAttempts + 1;
  const lock = attempts >= MAX_FAILED_LOGINS;
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: lock ? 0 : attempts, ...(lock ? { lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60_000) } : {}) },
  });
  await logAudit(user.tenantId, user.name, lock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED', detail, 'HIGH', req.ip);
}

function isLocked(user: UserWithRelations) {
  return user.lockedUntil !== null && user.lockedUntil > new Date();
}

router.post('/login', async (req, res) => {
  const parsed = loginInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;

  const user = await prisma.user.findFirst({ where: { email }, include: userRelations });
  if (user && isLocked(user)) {
    return res.status(423).json({ error: `Too many failed attempts. Try again after ${user.lockedUntil!.toLocaleTimeString('en-IN')}.` });
  }

  const passwordValid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !passwordValid) {
    if (user) await recordFailedLogin(req, user, `Failed login attempt for ${email}`);
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (rejectIfBlocked(user, res)) return;

  if (user.twoFaEnabled && user.twoFaSecret) {
    const pendingToken = issuePendingTwoFaToken(user.id);
    if (!pendingToken) return res.status(500).json({ error: 'Server auth configuration is missing JWT secrets' });
    return res.json({ requiresTwoFactor: true, pendingToken });
  }

  return completeLogin(req, res, user, '');
});

// Second step of login when the account has 2FA enabled: exchange a valid
// pendingToken + TOTP code for the real access/refresh tokens.
router.post('/login/2fa-verify', async (req, res) => {
  const parsed = twoFaVerifyInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { pendingToken, token: code } = parsed.data;

  const userId = verifyPendingTwoFaToken(pendingToken);
  if (!userId) return res.status(401).json({ error: 'Login session expired — please sign in again' });

  const user = await findUserById(userId);
  if (!user || !user.twoFaSecret) return res.status(401).json({ error: 'Invalid session' });
  if (isLocked(user)) return res.status(423).json({ error: 'Too many failed attempts. Try again later.' });
  if (rejectIfBlocked(user, res)) return;

  const valid = speakeasy.totp.verify({ secret: user.twoFaSecret, encoding: 'base32', token: code, window: 1 });
  if (!valid) {
    await recordFailedLogin(req, user, `Failed 2FA code entry for ${user.email}`);
    return res.status(401).json({ error: 'Invalid authentication code' });
  }

  return completeLogin(req, res, user, ' (2FA)');
});

// Per-store failed-PIN throttle. A 4-digit PIN has only 10,000 values, so
// besides the gateway's per-IP limit, each store gets a small failure budget
// per window regardless of where the guesses come from.
const PIN_WINDOW_MS = 10 * 60_000;
const PIN_MAX_FAILURES = 10;
const pinFailures = new Map<string, { count: number; resetAt: number }>();

function pinThrottled(storeId: string) {
  const entry = pinFailures.get(storeId);
  return Boolean(entry && entry.resetAt > Date.now() && entry.count >= PIN_MAX_FAILURES);
}

function recordPinFailure(storeId: string) {
  const now = Date.now();
  const entry = pinFailures.get(storeId);
  if (!entry || entry.resetAt <= now) pinFailures.set(storeId, { count: 1, resetAt: now + PIN_WINDOW_MS });
  else entry.count += 1;
}

// POS terminal quick-login: a cashier taps their 4-digit PIN instead of
// typing email/password. Scoped to the staff of the one store this terminal
// is paired with (assigned to it, or unassigned staff of the same tenant).
router.post('/login/pin', async (req, res) => {
  const parsed = pinLoginInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { pin, storeId } = parsed.data;

  if (pinThrottled(storeId)) {
    return res.status(429).json({ error: 'Too many incorrect PINs on this terminal. Ask a manager to sign in, or wait 10 minutes.' });
  }

  const store = await prisma.store.findFirst({ where: { id: storeId, isActive: true }, select: { id: true, name: true, tenantId: true } });
  if (!store) return res.status(404).json({ error: 'This terminal is paired with a store that no longer exists. Re-pair it.' });

  const candidates = await prisma.user.findMany({
    where: {
      tenantId: store.tenantId,
      pinHash: { not: null },
      isActive: true,
      OR: [{ storeId: store.id }, { storeId: null }],
    },
    include: userRelations,
  });

  let matched: UserWithRelations | null = null;
  for (const candidate of candidates) {
    if (candidate.pinHash && (await bcrypt.compare(pin, candidate.pinHash))) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    recordPinFailure(storeId);
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  if (isLocked(matched)) return res.status(423).json({ error: 'This account is temporarily locked.' });
  if (rejectIfBlocked(matched, res)) return;

  const tokens = issueTokens({ ...matched, storeId: store.id }, { pinStoreId: store.id });
  if (!tokens) return res.status(500).json({ error: 'Server auth configuration is missing JWT secrets' });

  await prisma.user.update({ where: { id: matched.id }, data: { lastActivityAt: new Date() } });
  await logAudit(matched.tenantId, matched.name, 'LOGIN_SUCCESS', `${matched.name} authenticated via terminal PIN at ${store.name}`, 'LOW', req.ip);

  res.json({
    ...tokens,
    user: { ...(await serializeUser(matched)), storeId: store.id },
    store: { id: store.id, name: store.name },
  });
});

// Rotates the refresh token on every use. Revocation: the refresh token
// carries the user's tokenVersion, and logout / password reset /
// deactivation bump it, so earlier refresh tokens stop working at once.
router.post('/refresh', async (req, res) => {
  const parsed = refreshInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const payload = verifyRefreshToken(parsed.data.refreshToken);
  const invalid = () => res.status(401).json({ error: 'Invalid or expired refresh token — please sign in again' });
  if (!payload) return invalid();

  const user = await findUserById(payload.sub);
  if (!user || user.tokenVersion !== payload.ver) return invalid();
  if (payload.sid && (await prisma.revokedSession.findUnique({ where: { id: payload.sid }, select: { id: true } }))) return invalid();
  if (rejectIfBlocked(user, res)) return;

  // A PIN session keeps acting on its terminal's store (unassigned staff would
  // otherwise fall back to the primary store), while that store is still
  // active and the user hasn't been assigned elsewhere.
  let pinStoreId: string | undefined;
  if (payload.store && (!user.storeId || user.storeId === payload.store)) {
    const store = await prisma.store.findFirst({ where: { id: payload.store, tenantId: user.tenantId, isActive: true }, select: { id: true } });
    pinStoreId = store?.id;
  }

  const tokens = issueTokens(pinStoreId ? { ...user, storeId: pinStoreId } : user, { sid: payload.sid, pinStoreId });
  if (!tokens) return res.status(500).json({ error: 'Server auth configuration is missing JWT secrets' });

  const serialized = await serializeUser(user);
  res.json({ ...tokens, user: pinStoreId ? { ...serialized, storeId: pinStoreId } : serialized });
});

// Ends this device's session (its refresh token's sid is revoked), or every
// session for the user (bumping tokenVersion invalidates all outstanding
// refresh tokens). Access tokens expire on their own (≤15 min).
router.post('/logout', requireAuth, async (req, res) => {
  const parsed = logoutInput.safeParse(req.body ?? {});
  const body = parsed.success ? parsed.data : {};
  const userId = req.authUser!.sub;
  const session = body.refreshToken && !body.all ? verifyRefreshToken(body.refreshToken) : null;
  const single = !!session?.sid && session.sub === userId;

  let user;
  if (single) {
    const expiresAt = new Date((session!.exp ?? Math.floor(Date.now() / 1000) + 30 * 86_400) * 1000);
    await prisma.revokedSession.upsert({ where: { id: session!.sid! }, create: { id: session!.sid!, userId, expiresAt }, update: {} });
    // Revocations only matter until the token would have expired anyway.
    await prisma.revokedSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  } else {
    user = await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
  }
  await logAudit(user.tenantId, user.name, 'LOGOUT', `${user.name} signed out${single ? '' : ' of every device'}`, 'LOW', req.ip);
  res.status(204).end();
});

// Platform support: the super admin signs in as a tenant's owner to see what
// they see. It's a separate session (its own sid), so ending it revokes only
// that session, never the owner's own devices, and it's written to the
// tenant's audit log as HIGH risk so the owner can see it happened.
const impersonateInput = z.object({ tenantId: z.string().min(1) });

router.post('/impersonate', requireAuth, requirePermission('platform:manage'), async (req, res) => {
  const parsed = impersonateInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const admin = await prisma.user.findUnique({ where: { id: req.authUser!.sub }, select: { name: true, email: true } });
  const owner = await prisma.user.findFirst({
    where: { tenantId: parsed.data.tenantId, role: 'TENANT_OWNER', isActive: true },
    orderBy: { createdAt: 'asc' },
    include: userRelations,
  });
  if (!owner) return res.status(404).json({ error: 'This tenant has no active owner account to sign in as' });

  const tokens = issueTokens(owner);
  if (!tokens) return res.status(500).json({ error: 'Server auth configuration is missing JWT secrets' });

  const adminLabel = admin ? `${admin.name} (${admin.email})` : 'Platform admin';
  await logAudit(owner.tenantId, adminLabel, 'IMPERSONATION_STARTED', `Platform admin signed in as owner ${owner.name} (${owner.email})`, 'HIGH', req.ip);
  res.json({ ...tokens, user: await serializeUser(owner) });
});

// "Am I still logged in, and who am I?" — 200 means carry on, 401 means
// try /refresh (or fall back to login if that fails too).
router.get('/me', requireAuth, async (req, res) => {
  const user = await findUserById(req.authUser!.sub);
  if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
  res.json(await serializeUser(user));
});

export default router;
