const rbacPerms = (pos: boolean[], inv: boolean[], fin: boolean[], crm: boolean[]) => {
  const keys = ['view', 'create', 'edit', 'delete', 'approve', 'export'] as const;
  const zip = (vals: boolean[]) => Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
  return { pos: zip(pos), inventory: zip(inv), finance: zip(fin), crm: zip(crm) };
};

// Mirrors database/prisma/seed.ts's roleDefs — the same six-role starter kit
// every demo tenant gets, so a self-serve signup's Roles & Security page
// isn't empty on day one either. Registration only ever assigns
// ROLE_SUPER_ADMIN to the owner; the rest exist so the owner can immediately
// invite staff into a real role instead of building one from scratch first.
export const DEFAULT_ROLE_DEFS = [
  {
    code: 'ROLE_SUPER_ADMIN',
    title: 'Super Administrator',
    accessScope: 'Global System Wide',
    colorTheme: 'purple',
    isSystem: true,
    description: 'Unrestricted enterprise access to all tenant configurations, financial records, white label parameters, and user roles.',
    permissions: rbacPerms([true, true, true, true, true, true], [true, true, true, true, true, true], [true, true, true, true, true, true], [true, true, true, true, true, true]),
  },
  {
    code: 'ROLE_STORE_MGR',
    title: 'Store General Manager',
    accessScope: 'Branch Operations',
    colorTheme: 'blue',
    isSystem: false,
    description: 'Manages daily store workflow, cashier shifts, stock overrides, supplier purchase orders, and local sales reports.',
    permissions: rbacPerms([true, true, true, true, true, true], [true, true, true, false, true, true], [true, false, false, false, false, true], [true, true, true, false, true, true]),
  },
  {
    code: 'ROLE_CASHIER',
    title: 'POS Terminal Cashier',
    accessScope: 'POS Counter Only',
    colorTheme: 'indigo',
    isSystem: false,
    description: 'Front-desk barcode scanning, cart management, customer selection, cash/UPI receipt generation, and hold bill recalls.',
    permissions: rbacPerms([true, true, true, false, false, false], [true, false, false, false, false, false], [false, false, false, false, false, false], [true, true, false, false, false, false]),
  },
  {
    code: 'ROLE_INVENTORY_LEAD',
    title: 'Inventory & Stock Lead',
    accessScope: 'Warehouse & Catalog',
    colorTheme: 'emerald',
    isSystem: false,
    description: 'Full control over SKU creation, barcode generation, warehouse rack transfers, damage adjustments, and purchase receiving.',
    permissions: rbacPerms([true, false, false, false, false, false], [true, true, true, true, true, true], [false, false, false, false, false, false], [false, false, false, false, false, false]),
  },
  {
    code: 'ROLE_FINANCE_AUDITOR',
    title: 'Finance & GST Auditor',
    accessScope: 'Read-Only Financials',
    colorTheme: 'amber',
    isSystem: false,
    description: 'Audits GSTR-1/3B tax reports, sales invoices, ledger balances, and profit margins. No operational editing privileges.',
    permissions: rbacPerms([true, false, false, false, false, true], [true, false, false, false, false, true], [true, true, false, false, true, true], [true, false, false, false, false, true]),
  },
  {
    code: 'ROLE_CRM_SPEC',
    title: 'CRM & Loyalty Specialist',
    accessScope: 'Branch Operations',
    colorTheme: 'pink',
    isSystem: false,
    description: 'Oversees customer database, assigns VIP loyalty tiers, issues promotional coupons, and handles store membership credit.',
    permissions: rbacPerms([true, false, false, false, false, false], [false, false, false, false, false, false], [false, false, false, false, false, false], [true, true, true, true, true, true]),
  },
] as const;
