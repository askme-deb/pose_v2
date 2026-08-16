export type RbacModuleKey = 'pos' | 'inventory' | 'finance' | 'crm';
export type RbacAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';
export type RbacColorTheme = 'purple' | 'blue' | 'indigo' | 'emerald' | 'amber' | 'pink' | 'teal';

export type ModulePermissionSet = Record<RbacAction, boolean>;
export type RbacPermissions = Record<RbacModuleKey, ModulePermissionSet>;

export interface RbacRole {
  id: string;
  title: string;
  code: string;
  accessScope: string;
  colorTheme: RbacColorTheme;
  description: string;
  isSystem: boolean;
  permissions: RbacPermissions;
}

export interface RbacModuleMeta {
  key: RbacModuleKey;
  icon: string;
  matrixLabel: string;
  drawerLabel: string;
  drawerGroup: string;
  actionLabels: Record<RbacAction, string>;
}

export const rbacActions: RbacAction[] = ['view', 'create', 'edit', 'delete', 'approve', 'export'];

export const rbacModules: RbacModuleMeta[] = [
  {
    key: 'pos',
    icon: '🛒',
    matrixLabel: 'POS Billing Terminal & Checkout',
    drawerLabel: 'POS Billing Terminal',
    drawerGroup: 'Sales & Checkout',
    actionLabels: {
      view: 'View POS',
      create: 'Create Invoice',
      edit: 'Hold / Recall',
      delete: 'Void Invoice',
      approve: 'Discount Override',
      export: 'Export Receipts',
    },
  },
  {
    key: 'inventory',
    icon: '📦',
    matrixLabel: 'Inventory Catalog & Stock Control',
    drawerLabel: 'Inventory Catalog & Stock',
    drawerGroup: 'Products & Suppliers',
    actionLabels: {
      view: 'View Products',
      create: 'Add New SKU',
      edit: 'Edit Prices',
      delete: 'Delete Product',
      approve: 'Stock Adjust',
      export: 'Export Catalog',
    },
  },
  {
    key: 'finance',
    icon: '💰',
    matrixLabel: 'GST Tax Filing & Sales Accounting',
    drawerLabel: 'Finance & GST Tax Suite',
    drawerGroup: 'Accounting & Filings',
    actionLabels: {
      view: 'View GST',
      create: 'File Returns',
      edit: 'Ledger Edit',
      delete: 'Void Ledger',
      approve: 'Tax Approval',
      export: 'Export Financials',
    },
  },
  {
    key: 'crm',
    icon: '👥',
    matrixLabel: 'Customer CRM & Loyalty Rewards',
    drawerLabel: 'CRM & Loyalty Rewards',
    drawerGroup: 'Customer Profiles',
    actionLabels: {
      view: 'View CRM',
      create: 'Add Customer',
      edit: 'Edit Points',
      delete: 'Delete Member',
      approve: 'VIP Upgrade',
      export: 'Export Contacts',
    },
  },
];

export const accessScopeOptions = [
  { value: 'Global System Wide', label: 'Global System Wide' },
  { value: 'Branch Operations', label: 'Branch Operations' },
  { value: 'POS Counter Only', label: 'POS Counter Only' },
  { value: 'Warehouse & Catalog', label: 'Warehouse & Catalog' },
  { value: 'Read-Only Financials', label: 'Read-Only Financials' },
];

export const colorThemeOptions: { value: RbacColorTheme; label: string }[] = [
  { value: 'teal', label: 'Teal Cyan' },
  { value: 'blue', label: 'Royal Blue' },
  { value: 'indigo', label: 'Indigo Violet' },
  { value: 'emerald', label: 'Emerald Green' },
  { value: 'amber', label: 'Amber Gold' },
  { value: 'pink', label: 'Rose Pink' },
];

export const roles: RbacRole[] = [
  {
    id: 'super-admin',
    title: 'Super Administrator',
    code: 'ROLE_SUPER_ADMIN',
    accessScope: 'Global System Wide',
    colorTheme: 'purple',
    isSystem: true,
    description:
      'Unrestricted enterprise access to all tenant configurations, financial records, white label parameters, and user roles.',
    permissions: {
      pos: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      inventory: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      finance: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      crm: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    },
  },
  {
    id: 'store-manager',
    title: 'Store General Manager',
    code: 'ROLE_STORE_MGR',
    accessScope: 'Branch Operations',
    colorTheme: 'blue',
    isSystem: false,
    description:
      'Manages daily store workflow, cashier shifts, stock overrides, supplier purchase orders, and local sales reports.',
    permissions: {
      pos: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      inventory: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
      finance: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
      crm: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    },
  },
  {
    id: 'pos-cashier',
    title: 'POS Terminal Cashier',
    code: 'ROLE_CASHIER',
    accessScope: 'POS Counter Only',
    colorTheme: 'indigo',
    isSystem: false,
    description:
      'Front-desk barcode scanning, cart management, customer selection, cash/UPI receipt generation, and hold bill recalls.',
    permissions: {
      pos: { view: true, create: true, edit: true, delete: false, approve: false, export: false },
      inventory: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
      crm: { view: true, create: true, edit: false, delete: false, approve: false, export: false },
    },
  },
  {
    id: 'inventory-lead',
    title: 'Inventory & Stock Lead',
    code: 'ROLE_INVENTORY_LEAD',
    accessScope: 'Warehouse & Catalog',
    colorTheme: 'emerald',
    isSystem: false,
    description:
      'Full control over SKU creation, barcode generation, warehouse rack transfers, damage adjustments, and purchase receiving.',
    permissions: {
      pos: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      inventory: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
      crm: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    },
  },
  {
    id: 'finance-auditor',
    title: 'Finance & GST Auditor',
    code: 'ROLE_FINANCE_AUDITOR',
    accessScope: 'Read-Only Financials',
    colorTheme: 'amber',
    isSystem: false,
    description:
      'Audits GSTR-1/3B tax reports, sales invoices, ledger balances, and profit margins. No operational editing privileges.',
    permissions: {
      pos: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
      inventory: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
      finance: { view: true, create: true, edit: false, delete: false, approve: true, export: true },
      crm: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    },
  },
  {
    id: 'crm-loyalty-spec',
    title: 'CRM & Loyalty Specialist',
    code: 'ROLE_CRM_SPEC',
    accessScope: 'Branch Operations',
    colorTheme: 'pink',
    isSystem: false,
    description:
      'Oversees customer database, assigns VIP loyalty tiers, issues promotional coupons, and handles store membership credit.',
    permissions: {
      pos: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      inventory: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
      finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
      crm: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    },
  },
];

export const roleOptions = roles.map((r) => ({ value: r.id, label: r.title }));

export const emptyPermissions: RbacPermissions = {
  pos: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  inventory: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  crm: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
};
