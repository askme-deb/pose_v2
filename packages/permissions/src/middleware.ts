import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { hasPermission, listHasPermission, type Role } from './roles';

export interface AuthedUser {
  sub: string;
  tenantId: string;
  role: Role;
  rbacRoleId: string | null;
  // Store the user is assigned to (cashiers at a counter), if any.
  storeId?: string | null;
  // Effective permissions from the tenant's RBAC matrix, computed when the
  // token was issued. Absent on older tokens — falls back to the role map.
  perms?: string[];
  // Only 'access' tokens authenticate API calls. Every other JWT signed with
  // the same secret (2FA-pending, password reset, ...) carries a different
  // `typ`/`purpose` and must be rejected here.
  typ: 'access';
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthedUser;
    }
  }
}

/** An error carrying an HTTP status; the shared error handler turns it into a response. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Shared by requireAuth (HTTP) and any Socket.IO handshake check that needs
// the same verification without an Express req/res to hang it on.
export function verifyToken(token: string): AuthedUser | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret) as Partial<AuthedUser> & { purpose?: string };
    if (payload.typ !== 'access' || payload.purpose) return null;
    if (!payload.sub || !payload.tenantId || !payload.role) return null;
    return payload as AuthedUser;
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

export function userHasPermission(user: AuthedUser | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.perms) return listHasPermission(user.perms, permission);
  return hasPermission(user.role, permission);
}

// Chain after requireAuth. 403s when the caller lacks `permission` — from
// their tenant RBAC matrix when the token carries one, otherwise from
// ROLE_PERMISSIONS (packages/permissions/src/roles.ts).
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!userHasPermission(req.authUser, permission)) {
      return res.status(403).json({ error: `Missing required permission: ${permission}` });
    }
    next();
  };
}

/**
 * The acting tenant for a request — always the tenant signed into the
 * caller's access token, never a client-supplied header. A header is
 * trivially forged; the token's claim was set by authentication-service at
 * login and is covered by the signature.
 */
export function tenantIdOf(req: Request): string {
  const tenantId = req.authUser?.tenantId;
  if (!tenantId) throw new HttpError(401, 'Missing tenant context');
  return tenantId;
}

// For the handful of server-to-server calls a service makes on a caller's
// behalf (e.g. payment-service completing a held bill through sales-service's
// checkout once Razorpay confirms payment) — no human is at the keyboard for
// requireAuth to check, but the receiving route still needs a token with a
// permitted role, bound to the tenant the work belongs to. 60s is long
// enough for one outgoing fetch, short enough that a leaked log line isn't a
// standing credential.
export function signInternalToken(tenantId: string, role: Role = 'tenant_owner') {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  const payload: AuthedUser = { sub: 'system', tenantId, role, rbacRoleId: null, typ: 'access' };
  return jwt.sign(payload, secret, { expiresIn: '60s' });
}
