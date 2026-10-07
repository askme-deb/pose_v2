export type Role =
  | 'super_admin'
  | 'tenant_owner'
  | 'branch_admin'
  | 'store_manager'
  | 'cashier'
  | 'accountant'
  | 'inventory_manager'
  | 'sales_executive';

// Permissions under this prefix manage the SaaS platform itself (every
// tenant, plans, white-label) rather than anything inside one tenant. A
// tenant_owner's '*' must never reach them — only super_admin holds them.
const PLATFORM_PREFIX = 'platform:';

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  super_admin: ['*', 'platform:manage'],
  tenant_owner: ['*'],
  branch_admin: ['store:manage', 'user:manage', 'report:view', 'billing:price_override', 'billing:refund'],
  store_manager: ['inventory:manage', 'sales:manage', 'report:view', 'billing:price_override', 'billing:refund'],
  cashier: ['billing:create', 'billing:view', 'billing:price_override'],
  accountant: ['report:view', 'payment:manage'],
  inventory_manager: ['inventory:manage', 'purchase:manage'],
  sales_executive: ['sales:manage', 'customer:manage'],
};

function grants(list: readonly string[], permission: string): boolean {
  if (list.includes(permission)) return true;
  return list.includes('*') && !permission.startsWith(PLATFORM_PREFIX);
}

export const hasPermission = (role: Role, permission: string): boolean => grants(ROLE_PERMISSIONS[role] ?? [], permission);

// Checks an explicit permission list (the `perms` claim baked into an access
// token from the tenant's RBAC matrix) with the same wildcard rule as roles.
export const listHasPermission = (perms: readonly string[], permission: string): boolean => grants(perms, permission);

// ---------- Tenant RBAC matrix (Roles & Security page) ----------

export type MatrixAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';
export type MatrixModule = 'pos' | 'inventory' | 'finance' | 'crm';
export type PermissionMatrix = Record<MatrixModule, Record<MatrixAction, boolean>>;

// Which matrix cell decides each permission string. Permissions missing here
// (user:manage, store:manage, platform:*) aren't representable in the matrix,
// so they keep coming from the user's fixed role.
export const MATRIX_PERMISSION_MAP: Record<string, [MatrixModule, MatrixAction]> = {
  'billing:view': ['pos', 'view'],
  'billing:create': ['pos', 'create'],
  'billing:price_override': ['pos', 'edit'],
  'billing:refund': ['pos', 'approve'],
  'inventory:manage': ['inventory', 'edit'],
  'purchase:manage': ['inventory', 'create'],
  'report:view': ['finance', 'view'],
  'payment:manage': ['finance', 'create'],
  'sales:manage': ['crm', 'edit'],
  'customer:manage': ['crm', 'create'],
};

function isMatrix(value: unknown): value is PermissionMatrix {
  if (!value || typeof value !== 'object') return false;
  return (['pos', 'inventory', 'finance', 'crm'] as const).every((m) => typeof (value as Record<string, unknown>)[m] === 'object');
}

/**
 * The permission list an access token carries. Without a tenant RBAC role
 * (or for tenant_owner/super_admin, who must never be able to lock
 * themselves out) it's just the fixed role's list. With one, every
 * matrix-representable permission is decided by the matrix, and the rest
 * still come from the fixed role.
 */
export function effectivePermissions(role: Role, matrix: unknown): string[] {
  const base = ROLE_PERMISSIONS[role] ?? [];
  if (role === 'tenant_owner' || role === 'super_admin' || !isMatrix(matrix)) return [...base];

  const result = new Set<string>();
  for (const perm of base) {
    if (perm === '*') continue;
    if (!(perm in MATRIX_PERMISSION_MAP)) result.add(perm);
  }
  // A non-owner role with '*' (none today) still keeps its unmapped grants.
  for (const [perm, [module, action]] of Object.entries(MATRIX_PERMISSION_MAP)) {
    if (matrix[module]?.[action]) result.add(perm);
  }
  return [...result];
}
