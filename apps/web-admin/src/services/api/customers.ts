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
