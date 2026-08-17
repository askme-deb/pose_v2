import {
  LayoutDashboard,
  ShoppingCart,
  PauseCircle,
  Package,
  Tags,
  ClipboardList,
  Truck,
  Receipt,
  Warehouse,
  Users,
  FileText,
  BarChart3,
  Smartphone,
  ShieldCheck,
  Settings,
  Crown,
  Building2,
  CreditCard,
  Palette,
  Globe,
  LogIn,
  type LucideIcon,
} from 'lucide-react';

export interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
  color: string;
}

export const dashboardLinks: NavLink[] = [
  { label: 'Tenant Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
];

export const salesLinks: NavLink[] = [
  { label: 'POS Billing Terminal', href: '/pos', icon: ShoppingCart, color: 'text-emerald-600' },
  { label: 'Hold & Suspend Bills', href: '/pos/held-bills', icon: PauseCircle, color: 'text-amber-600' },
  { label: 'Sales & Invoices', href: '/sales/invoices', icon: Receipt, color: 'text-blue-600' },
  { label: 'CRM & Loyalty', href: '/crm/customers', icon: Users, color: 'text-pink-600' },
];

export const masterDataLinks: NavLink[] = [
  { label: 'Categories & Brands', href: '/inventory/categories', icon: Tags, color: 'text-cyan-600' },
  { label: 'Purchase & Suppliers', href: '/purchases', icon: Truck, color: 'text-violet-600' },
];

export const productsLinks: NavLink[] = [
  { label: 'Inventory Catalog', href: '/inventory/products', icon: Package, color: 'text-indigo-600' },
];

export const inventoryLinks: NavLink[] = [
  { label: 'Stock Adjustment', href: '/inventory/stock-adjustments', icon: ClipboardList, color: 'text-orange-600' },
  { label: 'Warehouse & Racks', href: '/warehouse/transfers', icon: Warehouse, color: 'text-teal-600' },
];

export const reportsLinks: NavLink[] = [
  { label: 'GST Tax Suite', href: '/gst/reports', icon: FileText, color: 'text-rose-600' },
  { label: 'Analytics & Reports', href: '/reports/analytics', icon: BarChart3, color: 'text-emerald-600' },
];

export const administrationLinks: NavLink[] = [
  { label: 'Mobile Apps Hub', href: '/mobile-apps', icon: Smartphone, color: 'text-sky-600' },
  { label: 'Roles & RBAC', href: '/roles', icon: ShieldCheck, color: 'text-red-600' },
  { label: 'Company Settings', href: '/settings/business-profile', icon: Settings, color: 'text-slate-600' },
];

export const tenantOperationsLinks: NavLink[] = [
  ...dashboardLinks,
  ...salesLinks,
  ...masterDataLinks,
  ...productsLinks,
  ...inventoryLinks,
  ...reportsLinks,
  ...administrationLinks,
];

export const superAdminLinks: NavLink[] = [
  { label: 'Super Admin Overview', href: '/superadmin', icon: Crown, color: 'text-purple-600' },
  { label: 'Tenant Management', href: '/superadmin/tenants', icon: Building2, color: 'text-purple-600' },
  { label: 'Subscriptions & Plans', href: '/superadmin/subscriptions', icon: CreditCard, color: 'text-purple-600' },
  { label: 'White Label Branding', href: '/superadmin/white-label', icon: Palette, color: 'text-purple-600' },
];

export const publicLinks: NavLink[] = [
  { label: 'SaaS Landing Website', href: '/', icon: Globe, color: 'text-slate-600' },
  { label: 'Auth Portal', href: '/login', icon: LogIn, color: 'text-slate-600' },
];
