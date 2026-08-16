export type TenantPlan = 'starter' | 'professional' | 'enterprise';
export type TenantStatus = 'active' | 'trialing' | 'past_due' | 'suspended';
export type TenantRegion = 'mumbai' | 'virginia' | 'frankfurt';

export interface Tenant {
  id: string;
  organizationName: string;
  subdomain: string;
  plan: TenantPlan;
  storesUsed: number;
  storesLimit: number;
  monthlyBilling: number;
  status: TenantStatus;
  storageUsedGB: number;
  storageLimitGB: number;
  dbInstancePod: string;
  region: TenantRegion;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
}

export const tenants: Tenant[] = [
  { id: 'ten-101', organizationName: 'Apex Supermarket Chain', subdomain: 'apex', plan: 'enterprise', storesUsed: 4, storesLimit: 25, monthlyBilling: 149999, status: 'active', storageUsedGB: 142, storageLimitGB: 500, dbInstancePod: 'pg-pod-apex-01', region: 'mumbai', ownerName: 'Alexander Wright', ownerEmail: 'admin@apexsupermarket.com', createdAt: '2024-03-12T09:00:00Z' },
  { id: 'ten-102', organizationName: 'Metro Hypermarket Ltd', subdomain: 'metro', plan: 'enterprise', storesUsed: 12, storesLimit: 50, monthlyBilling: 249999, status: 'active', storageUsedGB: 380, storageLimitGB: 1000, dbInstancePod: 'pg-pod-metro-02', region: 'mumbai', ownerName: 'Vikramaditya Rao', ownerEmail: 'v.rao@metrohyper.com', createdAt: '2023-11-05T09:00:00Z' },
  { id: 'ten-103', organizationName: 'QuickBite Restaurant Group', subdomain: 'quickbite', plan: 'professional', storesUsed: 6, storesLimit: 10, monthlyBilling: 49999, status: 'active', storageUsedGB: 85, storageLimitGB: 250, dbInstancePod: 'pg-pod-quickbite-03', region: 'mumbai', ownerName: 'Ananya Deshmukh', ownerEmail: 'ananya@quickbite.com', createdAt: '2024-06-18T09:00:00Z' },
  { id: 'ten-104', organizationName: 'Zenith Pharma Labs', subdomain: 'zenithpharma', plan: 'enterprise', storesUsed: 8, storesLimit: 20, monthlyBilling: 149999, status: 'active', storageUsedGB: 210, storageLimitGB: 500, dbInstancePod: 'pg-pod-zenith-04', region: 'virginia', ownerName: 'Dr. Cyrus Poonawalla', ownerEmail: 'cyrus@zenithpharma.com', createdAt: '2024-01-22T09:00:00Z' },
  { id: 'ten-105', organizationName: 'Luxe Fashion Retail', subdomain: 'luxefashion', plan: 'professional', storesUsed: 3, storesLimit: 5, monthlyBilling: 49999, status: 'active', storageUsedGB: 45, storageLimitGB: 250, dbInstancePod: 'pg-pod-luxe-05', region: 'frankfurt', ownerName: 'Natasha Kapoor', ownerEmail: 'natasha@luxefashion.com', createdAt: '2024-08-02T09:00:00Z' },
  { id: 'ten-106', organizationName: 'Organic Pantry Co', subdomain: 'organicpantry', plan: 'starter', storesUsed: 1, storesLimit: 1, monthlyBilling: 14999, status: 'trialing', storageUsedGB: 12, storageLimitGB: 50, dbInstancePod: 'pg-shared-schema-06', region: 'mumbai', ownerName: 'Karan Malhotra', ownerEmail: 'karan@organicpantry.com', createdAt: '2026-08-02T09:00:00Z' },
  { id: 'ten-107', organizationName: 'Sundar Departmental Stores', subdomain: 'sundarstores', plan: 'starter', storesUsed: 1, storesLimit: 2, monthlyBilling: 14999, status: 'past_due', storageUsedGB: 22, storageLimitGB: 50, dbInstancePod: 'pg-shared-schema-07', region: 'mumbai', ownerName: 'Rohit Sundaram', ownerEmail: 'rohit@sundarstores.com', createdAt: '2024-05-14T09:00:00Z' },
  { id: 'ten-108', organizationName: 'Bharat Electronics Retail', subdomain: 'bharatelectronics', plan: 'professional', storesUsed: 5, storesLimit: 10, monthlyBilling: 49999, status: 'suspended', storageUsedGB: 130, storageLimitGB: 250, dbInstancePod: 'pg-pod-bharat-08', region: 'virginia', ownerName: 'Priya Nair', ownerEmail: 'priya@bharatelectronics.com', createdAt: '2023-09-28T09:00:00Z' },
  { id: 'ten-109', organizationName: 'Coastal Seafood Mart', subdomain: 'coastalseafood', plan: 'starter', storesUsed: 1, storesLimit: 1, monthlyBilling: 14999, status: 'active', storageUsedGB: 8, storageLimitGB: 50, dbInstancePod: 'pg-shared-schema-09', region: 'mumbai', ownerName: 'Meera Pillai', ownerEmail: 'meera@coastalseafood.com', createdAt: '2025-02-10T09:00:00Z' },
  { id: 'ten-110', organizationName: 'Highland Coffee Roasters', subdomain: 'highlandcoffee', plan: 'professional', storesUsed: 4, storesLimit: 10, monthlyBilling: 49999, status: 'active', storageUsedGB: 60, storageLimitGB: 250, dbInstancePod: 'pg-pod-highland-10', region: 'frankfurt', ownerName: 'Devraj Singh', ownerEmail: 'devraj@highlandcoffee.com', createdAt: '2025-07-21T09:00:00Z' },
];

export const tenantDomain = (t: Tenant): string => `${t.subdomain}.apexpos.com`;

export const planLabels: Record<TenantPlan, string> = {
  starter: 'Starter POS Single',
  professional: 'Pro Business Retail',
  enterprise: 'Enterprise Ultimate',
};

export const statusLabels: Record<TenantStatus, string> = {
  active: 'Active',
  trialing: 'Trialing',
  past_due: 'Past Due',
  suspended: 'Suspended',
};

export const regionLabels: Record<TenantRegion, string> = {
  mumbai: 'ap-south-1 (Mumbai)',
  virginia: 'us-east-1 (Virginia)',
  frankfurt: 'eu-central-1 (Frankfurt)',
};

export const planMonthlyPrice: Record<TenantPlan, number> = {
  starter: 14999,
  professional: 49999,
  enterprise: 149999,
};

export const tenantOptions = tenants.map((t) => ({ value: t.id, label: `${t.organizationName} (${tenantDomain(t)})` }));
