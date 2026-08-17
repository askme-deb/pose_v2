import { apiClient } from './client';

export type ApiPaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'SPLIT';

export interface ApiInvoiceItem {
  productId: string;
  quantity: number;
  price: string;
  gstRate: string;
  total: string;
  product: { id: string; name: string };
}

export interface ApiInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  paymentMethod: ApiPaymentMethod;
  customerName: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  createdAt: string;
  items: ApiInvoiceItem[];
}

export interface CreateInvoiceInput {
  customerId?: string;
  paymentMethod: ApiPaymentMethod;
  items: { productId: string; quantity: number }[];
  discountPercent: number;
}

// idempotencyKey lets a queued offline sale be replayed safely later without
// risking a double-charge if an earlier attempt actually reached the server.
export function createInvoice(input: CreateInvoiceInput, idempotencyKey?: string): Promise<ApiInvoice> {
  return apiClient.post<ApiInvoice>('/api/sales/invoices', input, {
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
  });
}

// ApiClient.request throws `Error("API error ${status}: ${bodyText}")` — bodyText
// is the raw JSON string from the server, e.g. {"error":"Insufficient stock for X"}.
export function parseCheckoutError(err: unknown): string {
  if (err instanceof Error) {
    const match = err.message.match(/^API error \d+: ([\s\S]*)$/);
    if (match) {
      try {
        const body = JSON.parse(match[1]);
        if (typeof body.error === 'string') return body.error;
      } catch {
        // body wasn't JSON — fall through to the generic message below
      }
    }
  }
  return 'Checkout failed — please try again';
}

// fetch() rejects with a plain TypeError before ApiClient ever gets a response
// to turn into an "API error ..." message — that's the one clean signal that
// distinguishes "we're offline" from a real HTTP error (like insufficient stock).
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}
