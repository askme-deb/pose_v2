export type Role =
  | 'super_admin'
  | 'tenant_owner'
  | 'branch_admin'
  | 'store_manager'
  | 'cashier'
  | 'accountant'
  | 'inventory_manager'
  | 'sales_executive';

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  super_admin: ['*'],
  tenant_owner: ['*'],
  branch_admin: ['store:manage', 'user:manage', 'report:view'],
  store_manager: ['inventory:manage', 'sales:manage', 'report:view'],
  cashier: ['billing:create', 'billing:view'],
  accountant: ['report:view', 'payment:manage'],
  inventory_manager: ['inventory:manage', 'purchase:manage'],
  sales_executive: ['sales:manage', 'customer:manage'],
};

export const hasPermission = (role: Role, permission: string): boolean =>
  ROLE_PERMISSIONS[role]?.includes('*') || ROLE_PERMISSIONS[role]?.includes(permission);
