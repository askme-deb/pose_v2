import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const pinLoginInput = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
});

const refreshInput = z.object({
  refreshToken: z.string().min(1),
});

const twoFaVerifyInput = z.object({
  pendingToken: z.string().min(1),
  token: z.string().length(6),
});

// Prisma's UserRole enum -> the lowercase Role union the frontend/permissions
// package expects.
const roleMap: Record<string, string> = {
  TENANT_OWNER: 'tenant_owner',
  BRANCH_ADMIN: 'branch_admin',
  STORE_MANAGER: 'store_manager',
  CASHIER: 'cashier',
  ACCOUNTANT: 'accountant',
  INVENTORY_MANAGER: 'inventory_manager',
  SALES_EXECUTIVE: 'sales_executive',
};

function issueTokens(userId: string, tenantId: string, role: string, rbacRoleId: string | null) {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtSecret || !refreshSecret) return null;

  const token = jwt.sign({ sub: userId, tenantId, role, rbacRoleId }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  } as jwt.SignOptions);
  const refreshToken = jwt.sign({ sub: userId }, refreshSecret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
  return { token, refreshToken };
}

// Short-lived, single-purpose token proving "this caller just supplied a
// valid password for this user" without granting access yet — the frontend
// carries it to /login/2fa-verify. Stateless (no server-side session store),
// same approach the rest of this file already takes with JWTs.
function issuePendingTwoFaToken(userId: string) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return null;
  return jwt.sign({ sub: userId, purpose: '2fa-pending' }, jwtSecret, { expiresIn: '5m' } as jwt.SignOptions);
}

type UserWithRelations = {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenant: { name: string };
  rbacRole: { id: string; title: string; code: string } | null;
};

// The exact same shape every login-family route below returns — pulled out
// once /refresh and /me needed it too, rather than a fourth copy-paste.
function serializeUser(user: UserWithRelations) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: roleMap[user.role] ?? 'cashier',
    tenantId: user.tenantId,
    tenantName: user.tenant.name,
    rbacRole: user.rbacRole,
  };
}

const userRelations = {
  rbacRole: { select: { id: true, title: true, code: true } },
  tenant: { select: { id: true, name: true, slug: true } },
} as const;

router.post('/login', async (req, res) => {
  const parsed = loginInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      rbacRole: { select: { id: true, title: true, code: true } },
      tenant: { select: { id: true, name: true, slug: true } },
    },
  });

  const passwordValid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !passwordValid) {
    if (user) await logAudit(user.tenantId, user.name, 'LOGIN_FAILED', `Failed login attempt for ${email}`, 'HIGH', req.ip);
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!user.isActive) {
    return res.status(403).json({ error: 'This account has been deactivated' });
  }

  if (user.twoFaEnabled) {
    const pendingToken = issuePendingTwoFaToken(user.id);
    if (!pendingToken) {
      return res.status(500).json({ error: 'Server auth configuration is missing JWT secrets' });
    }
    return res.json({ requiresTwoFactor: true, pendingToken });
  }

  const role = roleMap[user.role] ?? 'cashier';
  const tokens = issueTokens(user.id, user.tenantId, role, user.rbacRoleId);
  if (!tokens) {
    return res.status(500).json({ error: 'Server auth configuration is missing JWT secrets' });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastActivityAt: new Date() } });
  await logAudit(user.tenantId, user.name, 'LOGIN_SUCCESS', `${user.name} authenticated successfully`, 'LOW', req.ip);

  res.json({
    ...tokens,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      rbacRole: user.rbacRole,
    },
  });
});

// Second step of login when the account has 2FA enabled: exchange a valid
// pendingToken + TOTP code for the real access/refresh tokens /login would
// have issued directly if 2FA were off.
router.post('/login/2fa-verify', async (req, res) => {
  const parsed = twoFaVerifyInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { pendingToken, token: code } = parsed.data;

  let payload: { sub: string; purpose: string };
  try {
    payload = jwt.verify(pendingToken, process.env.JWT_SECRET!) as typeof payload;
  } catch {
    return res.status(401).json({ error: 'Login session expired — please sign in again' });
  }
  if (payload.purpose !== '2fa-pending') {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.sub },
    include: {
      rbacRole: { select: { id: true, title: true, code: true } },
      tenant: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!user || !user.twoFaSecret) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const valid = speakeasy.totp.verify({ secret: user.twoFaSecret, encoding: 'base32', token: code, window: 1 });
  if (!valid) {
    await logAudit(user.tenantId, user.name, 'LOGIN_FAILED', `Failed 2FA code entry for ${user.email}`, 'HIGH', req.ip);
    return res.status(401).json({ error: 'Invalid authentication code' });
  }

  const role = roleMap[user.role] ?? 'cashier';
  const tokens = issueTokens(user.id, user.tenantId, role, user.rbacRoleId);
  if (!tokens) {
    return res.status(500).json({ error: 'Server auth configuration is missing JWT secrets' });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastActivityAt: new Date() } });
  await logAudit(user.tenantId, user.name, 'LOGIN_SUCCESS', `${user.name} authenticated successfully (2FA)`, 'LOW', req.ip);

  res.json({
    ...tokens,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      rbacRole: user.rbacRole,
    },
  });
});

// POS terminal quick-login: a cashier taps their 4-digit PIN instead of
// typing email/password. PINs aren't unique on their own (unlike email), so
// this checks the PIN against every active user who has one set — fine at
// demo scale, would need a store/terminal-scoped lookup to stay fast with a
// large cashier roster.
router.post('/login/pin', async (req, res) => {
  const parsed = pinLoginInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { pin } = parsed.data;

  const candidates = await prisma.user.findMany({
    where: { pinHash: { not: null }, isActive: true },
    include: {
      store: { select: { id: true, name: true } },
      rbacRole: { select: { id: true, title: true, code: true } },
      tenant: { select: { id: true, name: true } },
    },
  });

  let matched: (typeof candidates)[number] | null = null;
  for (const candidate of candidates) {
    if (candidate.pinHash && (await bcrypt.compare(pin, candidate.pinHash))) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  const role = roleMap[matched.role] ?? 'cashier';
  const tokens = issueTokens(matched.id, matched.tenantId, role, matched.rbacRoleId);
  if (!tokens) {
    return res.status(500).json({ error: 'Server auth configuration is missing JWT secrets' });
  }

  await prisma.user.update({ where: { id: matched.id }, data: { lastActivityAt: new Date() } });
  await logAudit(matched.tenantId, matched.name, 'LOGIN_SUCCESS', `${matched.name} authenticated via terminal PIN`, 'LOW', req.ip);

  res.json({
    ...tokens,
    user: {
      id: matched.id,
      name: matched.name,
      email: matched.email,
      role,
      tenantId: matched.tenantId,
      tenantName: matched.tenant.name,
      rbacRole: matched.rbacRole,
    },
    store: matched.store,
  });
});

// Every login route above issues a refresh token nobody could ever redeem —
// this is that endpoint. It matters most for mobile: a 15-minute access
// token with no way to refresh means getting logged out mid-shift, which is
// tolerable to shrug off on a web app but not on a phone. Rotates the
// refresh token on every use (new one issued, old one not tracked anywhere
// to invalidate) — real rotation hygiene, though full revoke-on-reuse
// detection would need a server-side token store this codebase doesn't have
// yet, consistent with every other route here staying stateless-JWT.
router.post('/refresh', async (req, res) => {
  const parsed = refreshInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  let payload: { sub: string };
  try {
    payload = jwt.verify(parsed.data.refreshToken, process.env.JWT_REFRESH_SECRET!) as typeof payload;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token — please sign in again' });
  }

  const user = await prisma.user.findFirst({ where: { id: payload.sub }, include: userRelations });
  if (!user) return res.status(401).json({ error: 'Invalid or expired refresh token — please sign in again' });
  if (!user.isActive) return res.status(403).json({ error: 'This account has been deactivated' });

  const role = roleMap[user.role] ?? 'cashier';
  const tokens = issueTokens(user.id, user.tenantId, role, user.rbacRoleId);
  if (!tokens) return res.status(500).json({ error: 'Server auth configuration is missing JWT secrets' });

  res.json({ ...tokens, user: serializeUser(user) });
});

// "Am I still logged in, and who am I?" — what a mobile app's splash screen
// calls on launch against whatever token it has stored, instead of forcing a
// fresh login every time the app is reopened. requireAuth already 401s on a
// missing/expired/invalid token, so the client's answer is just: 200 means
// carry on, 401 means try /refresh (or fall back to login if that fails too).
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findFirst({ where: { id: req.authUser!.sub }, include: userRelations });
  if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
  res.json(serializeUser(user));
});

export default router;
