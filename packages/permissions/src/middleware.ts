import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { hasPermission, type Role } from './index';

export interface AuthedUser {
  sub: string;
  tenantId: string;
  role: Role;
  rbacRoleId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthedUser;
    }
  }
}

// Shared by requireAuth (HTTP) and any Socket.IO handshake check that needs
// the same verification without an Express req/res to hang it on.
export function verifyToken(token: string): AuthedUser | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    return jwt.verify(token, secret) as AuthedUser;
  } catch {
    return null;
  }
}

// Every service verifies the same access token authentication-service issues
// (shared JWT_SECRET) — this is deliberately independent of the api-gateway
// check so a service stays protected even if it's ever reached directly,
// bypassing the gateway.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'Server auth configuration is missing JWT_SECRET' });

  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
  req.authUser = user;
  next();
}

// Chain after requireAuth. 403s when the caller's role lacks `permission` in
// ROLE_PERMISSIONS (packages/permissions/src/index.ts) — the same map the
// frontend already reads to decide what to show, now actually enforced.
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.authUser?.role;
    if (!role || !hasPermission(role, permission)) {
      return res.status(403).json({ error: `Missing required permission: ${permission}` });
    }
    next();
  };
}

// For the handful of server-to-server calls a service makes on a caller's
// behalf (e.g. payment-service completing a held bill through sales-service's
// checkout once Razorpay confirms payment) — no human is at the keyboard for
// requireAuth to check, but the receiving route still needs a token with a
// permitted role. 60s is long enough for one outgoing fetch, short enough
// that a leaked log line isn't a standing credential.
export function signInternalToken(role: Role = 'tenant_owner') {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return jwt.sign({ sub: 'system', tenantId: 'internal', role, rbacRoleId: null }, secret, { expiresIn: '60s' });
}
