import { apiClient } from './client';

export type PaymentMethod = 'UPI' | 'CARD' | 'CASH';
export type InvoiceStatus = 'PAID' | 'REFUNDED' | 'DRAFT' | 'HELD' | 'PARTIALLY_PAID' | 'CANCELLED';

export interface LiveInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  itemsSummary: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  createdAt: string;
}

interface ApiInvoiceItem {
  quantity: number;
  product: { id: string; name: string };
}

interface ApiInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  paymentMethod: PaymentMethod;
  subtotal: string;
  taxTotal: string;
  total: string;
  status: InvoiceStatus;
  createdAt: string;
  items: ApiInvoiceItem[];
}

function toLive(inv: ApiInvoice): LiveInvoice {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    itemsSummary: inv.items.map((i) => `${i.product.name} (x${i.quantity})`).join(', '),
    paymentMethod: inv.paymentMethod,
    subtotal: Number(inv.subtotal),
    gstAmount: Number(inv.taxTotal),
    totalAmount: Number(inv.total),
    status: inv.status,
    createdAt: inv.createdAt,
  };
}

export async function listInvoices(): Promise<LiveInvoice[]> {
  const invoices = await apiClient.get<ApiInvoice[]>('/api/sales/invoices');
  return invoices.map(toLive);
}

export async function refundInvoice(id: string): Promise<LiveInvoice> {
  const invoice = await apiClient.post<ApiInvoice>(`/api/sales/invoices/${id}/refund`, {});
  return toLive(invoice);
}
