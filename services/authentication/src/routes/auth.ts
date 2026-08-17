import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';

const router = Router();

const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const pinLoginInput = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
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

export default router;
