import { apiClient } from './client';

export interface HeldBillItem {
  productId: string;
  name: string;
  price: number;
  gstRate: number;
  quantity: number;
}

export interface ApiHeldItem {
  id: string;
  productId: string;
  quantity: number;
  price: string;
  gstRate: string;
  total: string;
  product: { id: string; name: string };
}

export interface ApiHeldBill {
  id: string;
  label: string | null;
  customerId: string | null;
  customerName: string;
  heldDiscountPercent: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  createdAt: string;
  items: ApiHeldItem[];
}

export interface RecalledBill {
  customerId: string | null;
  customerName: string;
  discountPercent: number;
  items: HeldBillItem[];
}

export interface HoldBillInput {
  customerId?: string;
  items: { productId: string; quantity: number }[];
  discountPercent: number;
  label: string;
}

export function holdBill(input: HoldBillInput): Promise<ApiHeldBill> {
  return apiClient.post<ApiHeldBill>('/api/billing/invoices/hold', input);
}

export function listHeldBills(): Promise<ApiHeldBill[]> {
  return apiClient.get<ApiHeldBill[]>('/api/billing/invoices/held');
}

export function recallHeldBill(id: string): Promise<RecalledBill> {
  return apiClient.post<RecalledBill>(`/api/billing/invoices/${id}/recall`, {});
}

export function voidHeldBill(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/billing/invoices/${id}`);
}

export function splitHeldBill(id: string, itemIds: string[]): Promise<ApiHeldBill> {
  return apiClient.post<ApiHeldBill>(`/api/billing/invoices/${id}/split`, { itemIds });
}

export function mergeHeldBills(sourceId: string, targetId: string): Promise<ApiHeldBill> {
  return apiClient.post<ApiHeldBill>('/api/billing/invoices/merge', { sourceId, targetId });
}
