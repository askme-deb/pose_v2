import { apiClient } from './client';
import { useAuthStore } from '../../store/useAuthStore';

export type TenantPlan = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type TenantStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';
export type TenantRegion = 'MUMBAI' | 'VIRGINIA' | 'FRANKFURT';
export type PaymentGateway = 'RAZORPAY' | 'STRIPE';
export type PlatformInvoiceStatus = 'PAID' | 'PENDING' | 'FAILED';

export interface LiveTenant {
  id: string;
  organizationName: string;
  subdomain: string;
  plan: TenantPlan;
  status: TenantStatus;
  storesUsed: number;
  storesLimit: number;
  monthlyBilling: number;
  storageUsedGB: number;
  storageLimitGB: number;
  dbInstancePod: string;
  region: TenantRegion;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
}

interface ApiTenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  storesUsed: number;
  storesLimit: number;
  monthlyBilling: number;
  storageUsedGB: number;
  storageLimitGB: number;
  dbInstancePod: string | null;
  region: TenantRegion;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: string;
}

interface ApiTenantBranding {
  appTitle: string | null;
  faviconUrl: string | null;
  logoUrl: string | null;
  accentColor: string;
  fontFamily: string;
  customCss: string | null;
  smtpFromLabel: string | null;
  smtpHost: string | null;
}

interface ApiPlatformInvoice {
  id: string;
  tenant: { id: string; name: string };
  plan: TenantPlan;
  gateway: PaymentGateway;
  gatewayRef: string;
  amountINR: number;
  status: PlatformInvoiceStatus;
  issuedAt: string;
}

interface ApiCnameDomain {
  id: string;
  tenant: { id: string; name: string };
  cnameDomain: string;
  edgeIngressTarget: string;
  sslSlaStatus: string;
  dnsPropagationStatus: string;
}

interface ApiPlatformAuditLog {
  id: string;
  tenant: { id: string; name: string };
  timestamp: string;
  actor: string;
  eventType: string;
  details: string;
  ipAddress: string | null;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH';
}

function toLiveTenant(t: ApiTenant): LiveTenant {
  return {
    id: t.id,
    organizationName: t.name,
    subdomain: t.slug,
    plan: t.plan,
    status: t.status,
    storesUsed: t.storesUsed,
    storesLimit: t.storesLimit,
    monthlyBilling: t.monthlyBilling,
    storageUsedGB: t.storageUsedGB,
    storageLimitGB: t.storageLimitGB,
    dbInstancePod: t.dbInstancePod ?? '',
    region: t.region,
    ownerName: t.ownerName ?? '',
    ownerEmail: t.ownerEmail ?? '',
    createdAt: t.createdAt,
  };
}

function actorName(): string {
  return useAuthStore.getState().user?.name ?? 'Super Administrator';
}

export const tenantDomain = (t: LiveTenant): string => `${t.subdomain}.apexpos.com`;

export async function listTenants(): Promise<LiveTenant[]> {
  const tenants = await apiClient.get<ApiTenant[]>('/api/subscription/tenants');
  return tenants.map(toLiveTenant);
}

export interface TenantInput {
  organizationName: string;
  subdomain: string;
  ownerName: string;
  ownerEmail: string;
  plan: TenantPlan;
  storesLimit?: number;
  storageLimitGB?: number;
  region?: TenantRegion;
  dbStrategy?: 'dedicated' | 'shared';
}

export async function createTenant(input: TenantInput): Promise<LiveTenant> {
  const tenant = await apiClient.post<ApiTenant>('/api/subscription/tenants', { ...input, actorName: actorName() });
  return toLiveTenant(tenant);
}

export async function updateTenant(id: string, input: Partial<TenantInput>): Promise<LiveTenant> {
  const tenant = await apiClient.put<ApiTenant>(`/api/subscription/tenants/${id}`, { ...input, actorName: actorName() });
  return toLiveTenant(tenant);
}

export async function toggleTenantStatus(id: string): Promise<LiveTenant> {
  const tenant = await apiClient.post<ApiTenant>(`/api/subscription/tenants/${id}/toggle-status`, { actorName: actorName() });
  return toLiveTenant(tenant);
}

export interface LiveTenantBranding {
  appTitle: string;
  faviconUrl: string;
  logoUrl: string;
  accentColor: string;
  fontFamily: string;
  customCss: string;
  smtpFromLabel: string;
  smtpHost: string;
}

function toLiveBranding(b: ApiTenantBranding | null): LiveTenantBranding {
  return {
    appTitle: b?.appTitle ?? '',
    faviconUrl: b?.faviconUrl ?? '',
    logoUrl: b?.logoUrl ?? '',
    accentColor: b?.accentColor ?? '#2563eb',
    fontFamily: b?.fontFamily ?? 'Plus Jakarta Sans',
    customCss: b?.customCss ?? '',
    smtpFromLabel: b?.smtpFromLabel ?? '',
    smtpHost: b?.smtpHost ?? '',
  };
}

export async function getTenantBranding(tenantId: string): Promise<LiveTenantBranding> {
  const branding = await apiClient.get<ApiTenantBranding | null>(`/api/subscription/tenants/${tenantId}/branding`);
  return toLiveBranding(branding);
}

export async function updateTenantBranding(tenantId: string, input: Partial<LiveTenantBranding>): Promise<LiveTenantBranding> {
  const branding = await apiClient.put<ApiTenantBranding>(`/api/subscription/tenants/${tenantId}/branding`, {
    ...input,
    actorName: actorName(),
  });
  return toLiveBranding(branding);
}

export interface LivePlatformInvoice {
  id: string;
  date: string;
  tenantName: string;
  plan: TenantPlan;
  gateway: PaymentGateway;
  gatewayRef: string;
  amountINR: number;
  status: PlatformInvoiceStatus;
}

export async function listPlatformInvoices(): Promise<LivePlatformInvoice[]> {
  const invoices = await apiClient.get<ApiPlatformInvoice[]>('/api/subscription/platform-invoices');
  return invoices.map((i) => ({
    id: i.id,
    date: i.issuedAt,
    tenantName: i.tenant.name,
    plan: i.plan,
    gateway: i.gateway,
    gatewayRef: i.gatewayRef,
    amountINR: i.amountINR,
    status: i.status,
  }));
}

export interface LiveCnameDomain {
  id: string;
  tenantId: string;
  tenantOrg: string;
  cnameDomain: string;
  edgeIngressTarget: string;
  sslSlaStatus: string;
  dnsPropagationStatus: string;
}

export async function listCnameDomains(): Promise<LiveCnameDomain[]> {
  const domains = await apiClient.get<ApiCnameDomain[]>('/api/subscription/cname-domains');
  return domains.map((d) => ({
    id: d.id,
    tenantId: d.tenant.id,
    tenantOrg: d.tenant.name,
    cnameDomain: d.cnameDomain,
    edgeIngressTarget: d.edgeIngressTarget,
    sslSlaStatus: d.sslSlaStatus,
    dnsPropagationStatus: d.dnsPropagationStatus,
  }));
}

export async function createCnameDomain(tenantId: string, cnameDomain: string): Promise<LiveCnameDomain> {
  const domain = await apiClient.post<ApiCnameDomain>('/api/subscription/cname-domains', {
    tenantId,
    cnameDomain,
    actorName: actorName(),
  });
  return {
    id: domain.id,
    tenantId: domain.tenant.id,
    tenantOrg: domain.tenant.name,
    cnameDomain: domain.cnameDomain,
    edgeIngressTarget: domain.edgeIngressTarget,
    sslSlaStatus: domain.sslSlaStatus,
    dnsPropagationStatus: domain.dnsPropagationStatus,
  };
}

export interface LivePlatformAuditLog {
  id: string;
  timestamp: string;
  tenantName: string;
  actor: string;
  eventType: string;
  details: string;
  ipAddress: string;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH';
}

export async function listPlatformAuditLogs(): Promise<LivePlatformAuditLog[]> {
  const logs = await apiClient.get<ApiPlatformAuditLog[]>('/api/subscription/audit-logs');
  return logs.map((l) => ({
    id: l.id,
    timestamp: l.timestamp,
    tenantName: l.tenant.name,
    actor: l.actor,
    eventType: l.eventType,
    details: l.details,
    ipAddress: l.ipAddress ?? '',
    riskRating: l.riskRating,
  }));
}
