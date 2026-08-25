import jwt from 'jsonwebtoken';

// Prisma's UserRole enum -> the lowercase Role union the frontend/permissions
// package expects. Shared by every login route and by registration, which
// issues a session the same way a fresh login would.
export const roleMap: Record<string, string> = {
  TENANT_OWNER: 'tenant_owner',
  BRANCH_ADMIN: 'branch_admin',
  STORE_MANAGER: 'store_manager',
  CASHIER: 'cashier',
  ACCOUNTANT: 'accountant',
  INVENTORY_MANAGER: 'inventory_manager',
  SALES_EXECUTIVE: 'sales_executive',
};

export function issueTokens(userId: string, tenantId: string, role: string, rbacRoleId: string | null) {
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
