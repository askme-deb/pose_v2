import { apiClient } from './client';

export type CustomerTier = 'STANDARD' | 'SILVER' | 'GOLD' | 'VIP_DIAMOND';

export interface LiveCustomer {
  id: string;
  name: string;
  tier: CustomerTier;
  loyaltyPoints: number;
}

interface ApiCustomer {
  id: string;
  name: string;
  tier: CustomerTier;
  loyaltyPoints: number;
}

export async function listCustomers(): Promise<LiveCustomer[]> {
  const customers = await apiClient.get<ApiCustomer[]>('/api/sales/customers');
  return customers.map((c) => ({ id: c.id, name: c.name, tier: c.tier, loyaltyPoints: c.loyaltyPoints }));
}
