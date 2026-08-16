export interface PosCustomer {
  id: string;
  name: string;
  label: string;
  tier: 'Standard' | 'VIP' | 'Retail' | 'B2B Credit';
  discountPercent: number;
}

export const posCustomers: PosCustomer[] = [
  { id: 'walkin', name: 'Walk-in Customer', label: '👤 Walk-in Customer (Standard)', tier: 'Standard', discountPercent: 0 },
  { id: 'sarah', name: 'Sarah Jenkins', label: '⭐ Sarah Jenkins (VIP - 420 pts)', tier: 'VIP', discountPercent: 10 },
  { id: 'rahul', name: 'Rahul Sharma', label: '👤 Rahul Sharma (Retail)', tier: 'Retail', discountPercent: 0 },
  { id: 'corp', name: 'TechCorp Ltd', label: '🏢 TechCorp Ltd (B2B Credit)', tier: 'B2B Credit', discountPercent: 5 },
];

export const posCustomerOptions = posCustomers.map((c) => ({ value: c.name, label: c.label }));

export function getCustomerDiscountPercent(customerName: string): number {
  return posCustomers.find((c) => c.name === customerName)?.discountPercent ?? 0;
}

export function getCustomerTier(customerName: string): PosCustomer['tier'] | null {
  return posCustomers.find((c) => c.name === customerName)?.tier ?? null;
}
