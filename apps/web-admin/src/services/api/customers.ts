import { apiClient } from './client';

export type CustomerTier = 'STANDARD' | 'SILVER' | 'GOLD' | 'VIP_DIAMOND';

export interface LiveCustomer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  tier: CustomerTier;
  loyaltyPoints: number;
  lifetimeSpend: number;
  ordersCount: number;
  lastVisit: string | null;
  joinedAt: string;
  walletBalance: number;
  dateOfBirth: string | null;
  membershipPlanId: string | null;
  membershipPlanName: string | null;
  membershipDiscountPercent: number;
}

interface ApiMembershipPlanRef {
  id: string;
  name: string;
  discountPercent: string;
  isActive: boolean;
}

interface ApiCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tier: CustomerTier;
  loyaltyPoints: number;
  lifetimeSpend: number;
  ordersCount: number;
  lastVisit: string | null;
  createdAt: string;
  walletBalance: string;
  dateOfBirth: string | null;
  membershipPlanId: string | null;
  membershipPlan: ApiMembershipPlanRef | null;
}

function toLive(c: ApiCustomer): LiveCustomer {
  return {
    id: c.id,
    fullName: c.name,
    phone: c.phone ?? '',
    email: c.email ?? '',
    tier: c.tier,
    loyaltyPoints: c.loyaltyPoints,
    lifetimeSpend: c.lifetimeSpend,
    ordersCount: c.ordersCount,
    lastVisit: c.lastVisit,
    joinedAt: c.createdAt,
    walletBalance: Number(c.walletBalance),
    dateOfBirth: c.dateOfBirth,
    membershipPlanId: c.membershipPlanId,
    membershipPlanName: c.membershipPlan?.name ?? null,
    membershipDiscountPercent: c.membershipPlan ? Number(c.membershipPlan.discountPercent) : 0,
  };
}

export async function listCustomers(): Promise<LiveCustomer[]> {
  const customers = await apiClient.get<ApiCustomer[]>('/api/sales/customers');
  return customers.map(toLive);
}

export interface CustomerInput {
  name: string;
  phone?: string;
  email?: string;
  tier?: CustomerTier;
  loyaltyPoints?: number;
  dateOfBirth?: string | null;
  membershipPlanId?: string | null;
}

export async function createCustomer(input: CustomerInput): Promise<LiveCustomer> {
  const customer = await apiClient.post<ApiCustomer>('/api/sales/customers', input);
  return toLive(customer);
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<LiveCustomer> {
  const customer = await apiClient.put<ApiCustomer>(`/api/sales/customers/${id}`, input);
  return toLive(customer);
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiClient.delete(`/api/sales/customers/${id}`);
}

export async function creditBonusPoints(id: string, amount: number, reason: string): Promise<LiveCustomer> {
  const customer = await apiClient.post<ApiCustomer>(`/api/sales/customers/${id}/bonus-points`, { amount, reason });
  return toLive(customer);
}

// ---------- Wallet ----------

export type WalletTransactionType = 'TOP_UP' | 'REDEEM' | 'REFUND' | 'BIRTHDAY_BONUS';

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number;
  note: string | null;
  invoiceId: string | null;
  createdAt: string;
}

interface ApiWalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: string;
  note: string | null;
  invoiceId: string | null;
  createdAt: string;
}

export async function listWalletTransactions(customerId: string): Promise<WalletTransaction[]> {
  const rows = await apiClient.get<ApiWalletTransaction[]>(`/api/sales/customers/${customerId}/wallet/transactions`);
  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

export async function topUpWallet(customerId: string, amount: number, note?: string): Promise<LiveCustomer> {
  const customer = await apiClient.post<ApiCustomer>(`/api/sales/customers/${customerId}/wallet/topup`, { amount, note });
  return toLive(customer);
}

export async function redeemWallet(customerId: string, amount: number, note?: string): Promise<LiveCustomer> {
  const customer = await apiClient.post<ApiCustomer>(`/api/sales/customers/${customerId}/wallet/redeem`, { amount, note });
  return toLive(customer);
}

// ---------- Membership plans ----------

export interface MembershipPlan {
  id: string;
  name: string;
  tier: CustomerTier;
  annualFee: number;
  discountPercent: number;
  benefits: string;
  isActive: boolean;
  enrolledCount: number;
}

interface ApiMembershipPlan {
  id: string;
  name: string;
  tier: CustomerTier;
  annualFee: string;
  discountPercent: string;
  benefits: string | null;
  isActive: boolean;
  _count: { customers: number };
}

function toLivePlan(p: ApiMembershipPlan): MembershipPlan {
  return {
    id: p.id,
    name: p.name,
    tier: p.tier,
    annualFee: Number(p.annualFee),
    discountPercent: Number(p.discountPercent),
    benefits: p.benefits ?? '',
    isActive: p.isActive,
    enrolledCount: p._count.customers,
  };
}

export async function listMembershipPlans(): Promise<MembershipPlan[]> {
  const plans = await apiClient.get<ApiMembershipPlan[]>('/api/sales/membership-plans');
  return plans.map(toLivePlan);
}

export interface MembershipPlanInput {
  name: string;
  tier: CustomerTier;
  annualFee?: number;
  discountPercent: number;
  benefits?: string;
  isActive?: boolean;
}

export async function createMembershipPlan(input: MembershipPlanInput): Promise<MembershipPlan> {
  const plan = await apiClient.post<ApiMembershipPlan>('/api/sales/membership-plans', input);
  return toLivePlan(plan);
}

export async function updateMembershipPlan(id: string, input: Partial<MembershipPlanInput>): Promise<MembershipPlan> {
  const plan = await apiClient.put<ApiMembershipPlan>(`/api/sales/membership-plans/${id}`, input);
  return toLivePlan(plan);
}

export async function deleteMembershipPlan(id: string): Promise<void> {
  await apiClient.delete(`/api/sales/membership-plans/${id}`);
}
