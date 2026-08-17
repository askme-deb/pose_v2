import { apiClient } from './client';

export interface SearchProductResult {
  _id: string;
  id: string;
  name: string;
  sku: string;
  price: number;
}

export interface SearchCustomerResult {
  _id: string;
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface SearchInvoiceResult {
  _id: string;
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  status: string;
}

export interface SearchResults {
  products: SearchProductResult[];
  customers: SearchCustomerResult[];
  invoices: SearchInvoiceResult[];
}

export function search(q: string): Promise<SearchResults> {
  return apiClient.get<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`);
}
