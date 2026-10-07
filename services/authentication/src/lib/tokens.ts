import jwt from 'jsonwebtoken';
import { effectivePermissions, type AuthedUser, type Role } from '@pospe/permissions';

// Prisma's UserRole enum -> the lowercase Role union the frontend/permissions
// package expects. Shared by every login route and by registration, which
// issues a session the same way a fresh login would.
export const roleMap: Record<string, Role> = {
  SUPER_ADMIN: 'super_admin',
  TENANT_OWNER: 'tenant_owner',
  BRANCH_ADMIN: 'branch_admin',
  STORE_MANAGER: 'store_manager',
  CASHIER: 'cashier',
  ACCOUNTANT: 'accountant',
  INVENTORY_MANAGER: 'inventory_manager',
  SALES_EXECUTIVE: 'sales_executive',
};

export interface TokenSubject {
  id: string;
  tenantId: string;
  role: string;
  rbacRoleId: string | null;
  storeId: string | null;
  tokenVersion: number;
  rbacRole?: { permissions?: unknown } | null;
}

export interface RefreshPayload {
  sub: string;
  typ: 'refresh';
  ver: number;
}

/**
 * Access token: carries tenant, role, assigned store and the effective
 * permission list from the tenant's RBAC matrix (so every service can
 * enforce it without a DB lookup; edits take effect at the next refresh).
 * Refresh token: carries the user's tokenVersion, so bumping it on logout or
 * password reset revokes every refresh token issued before.
 */
export function issueTokens(user: TokenSubject) {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtSecret || !refreshSecret) return null;

  const role = roleMap[user.role] ?? 'cashier';
  const payload: AuthedUser = {
    sub: user.id,
    tenantId: user.tenantId,
    role,
    rbacRoleId: user.rbacRoleId,
    storeId: user.storeId,
    perms: effectivePermissions(role, user.rbacRole?.permissions),
    typ: 'access',
  };
  const token = jwt.sign(payload, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  } as jwt.SignOptions);

  const refresh: RefreshPayload = { sub: user.id, typ: 'refresh', ver: user.tokenVersion };
  const refreshToken = jwt.sign(refresh, refreshSecret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
  return { token, refreshToken };
}

export function verifyRefreshToken(token: string): RefreshPayload | null {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret) as Partial<RefreshPayload>;
    if (payload.typ !== 'refresh' || !payload.sub || typeof payload.ver !== 'number') return null;
    return payload as RefreshPayload;
  } catch {
    return null;
  }
}

// Short-lived, single-purpose token proving "this caller just supplied a
// valid password for this user" without granting access yet. typ '2fa' means
// requireAuth (which only accepts typ 'access') rejects it everywhere else.
export function issuePendingTwoFaToken(userId: string) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return null;
  return jwt.sign({ sub: userId, typ: '2fa', purpose: '2fa-pending' }, jwtSecret, { expiresIn: '5m' } as jwt.SignOptions);
}

export function verifyPendingTwoFaToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub?: string; typ?: string; purpose?: string };
    return payload.typ === '2fa' && payload.purpose === '2fa-pending' && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
