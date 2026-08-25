import { apiClient } from './client';

export interface DocLineItem {
  productId: string;
  quantity: number;
}

// ---------- Quotations & Estimates ----------

export type QuoteKind = 'QUOTATION' | 'ESTIMATE';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';

export interface LiveQuoteItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  price: number;
  gstRate: number;
  total: number;
}

export interface LiveQuote {
  id: string;
  quoteNumber: string;
  kind: QuoteKind;
  status: QuoteStatus;
  customerId: string | null;
  customerName: string;
  validUntil: string | null;
  notes: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  convertedInvoiceId: string | null;
  createdAt: string;
  items: LiveQuoteItem[];
}

interface ApiQuoteItem {
  id: string;
  productId: string;
  quantity: number;
  price: string;
  gstRate: string;
  total: string;
  product: { id: string; name: string; sku: string };
}

interface ApiQuote {
  id: string;
  quoteNumber: string;
  kind: QuoteKind;
  status: QuoteStatus;
  customerId: string | null;
  customerName: string;
  validUntil: string | null;
  notes: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  convertedInvoiceId: string | null;
  createdAt: string;
  items: ApiQuoteItem[];
}

function toLiveQuote(q: ApiQuote): LiveQuote {
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    kind: q.kind,
    status: q.status,
    customerId: q.customerId,
    customerName: q.customerName,
    validUntil: q.validUntil,
    notes: q.notes,
    subtotal: Number(q.subtotal),
    taxTotal: Number(q.taxTotal),
    total: Number(q.total),
    convertedInvoiceId: q.convertedInvoiceId,
    createdAt: q.createdAt,
    items: q.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      productSku: i.product.sku,
      quantity: i.quantity,
      price: Number(i.price),
      gstRate: Number(i.gstRate),
      total: Number(i.total),
    })),
  };
}

export async function listQuotes(kind?: QuoteKind): Promise<LiveQuote[]> {
  const rows = await apiClient.get<ApiQuote[]>(`/api/sales/quotations${kind ? `?kind=${kind}` : ''}`);
  return rows.map(toLiveQuote);
}

export interface CreateQuoteInput {
  kind: QuoteKind;
  customerId?: string;
  items: DocLineItem[];
  validUntil?: string;
  notes?: string;
}

export async function createQuote(input: CreateQuoteInput): Promise<LiveQuote> {
  const row = await apiClient.post<ApiQuote>('/api/sales/quotations', input);
  return toLiveQuote(row);
}

export async function sendQuote(id: string): Promise<LiveQuote> {
  return toLiveQuote(await apiClient.post<ApiQuote>(`/api/sales/quotations/${id}/send`, {}));
}

export async function acceptQuote(id: string): Promise<LiveQuote> {
  return toLiveQuote(await apiClient.post<ApiQuote>(`/api/sales/quotations/${id}/accept`, {}));
}

export async function rejectQuote(id: string): Promise<LiveQuote> {
  return toLiveQuote(await apiClient.post<ApiQuote>(`/api/sales/quotations/${id}/reject`, {}));
}

export async function convertQuote(id: string, paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'SPLIT' = 'CASH'): Promise<LiveQuote> {
  return toLiveQuote(await apiClient.post<ApiQuote>(`/api/sales/quotations/${id}/convert`, { paymentMethod }));
}

export async function deleteQuote(id: string): Promise<void> {
  await apiClient.delete(`/api/sales/quotations/${id}`);
}

// ---------- Delivery Challans ----------

export type ChallanStatus = 'DRAFT' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export interface LiveChallanItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
}

export interface LiveChallan {
  id: string;
  challanNumber: string;
  status: ChallanStatus;
  customerId: string | null;
  customerName: string;
  vehicleNumber: string | null;
  transporterName: string | null;
  dispatchedAt: string | null;
  notes: string | null;
  createdAt: string;
  items: LiveChallanItem[];
}

interface ApiChallan {
  id: string;
  challanNumber: string;
  status: ChallanStatus;
  customerId: string | null;
  customerName: string;
  vehicleNumber: string | null;
  transporterName: string | null;
  dispatchedAt: string | null;
  notes: string | null;
  createdAt: string;
  items: { id: string; productId: string; quantity: number; product: { id: string; name: string; sku: string } }[];
}

function toLiveChallan(c: ApiChallan): LiveChallan {
  return {
    id: c.id,
    challanNumber: c.challanNumber,
    status: c.status,
    customerId: c.customerId,
    customerName: c.customerName,
    vehicleNumber: c.vehicleNumber,
    transporterName: c.transporterName,
    dispatchedAt: c.dispatchedAt,
    notes: c.notes,
    createdAt: c.createdAt,
    items: c.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      productSku: i.product.sku,
      quantity: i.quantity,
    })),
  };
}

export async function listChallans(): Promise<LiveChallan[]> {
  const rows = await apiClient.get<ApiChallan[]>('/api/sales/delivery-challans');
  return rows.map(toLiveChallan);
}

export interface CreateChallanInput {
  customerId?: string;
  items: DocLineItem[];
  vehicleNumber?: string;
  transporterName?: string;
  notes?: string;
}

export async function createChallan(input: CreateChallanInput): Promise<LiveChallan> {
  return toLiveChallan(await apiClient.post<ApiChallan>('/api/sales/delivery-challans', input));
}

export async function dispatchChallan(id: string): Promise<LiveChallan> {
  return toLiveChallan(await apiClient.post<ApiChallan>(`/api/sales/delivery-challans/${id}/dispatch`, {}));
}

export async function deliverChallan(id: string): Promise<LiveChallan> {
  return toLiveChallan(await apiClient.post<ApiChallan>(`/api/sales/delivery-challans/${id}/deliver`, {}));
}

export async function cancelChallan(id: string): Promise<LiveChallan> {
  return toLiveChallan(await apiClient.post<ApiChallan>(`/api/sales/delivery-challans/${id}/cancel`, {}));
}

// ---------- Credit Notes ----------

export type CreditDebitStatus = 'ISSUED' | 'CANCELLED';

export interface LiveCreditNote {
  id: string;
  creditNoteNumber: string;
  status: CreditDebitStatus;
  invoiceId: string;
  invoiceNumber: string | null;
  customerName: string;
  reason: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  createdAt: string;
  items: { productId: string; productName: string; quantity: number }[];
}

interface ApiCreditNote {
  id: string;
  creditNoteNumber: string;
  status: CreditDebitStatus;
  invoiceId: string;
  invoice: { id: string; invoiceNumber: string | null };
  customerName: string;
  reason: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  createdAt: string;
  items: { productId: string; quantity: number; product: { id: string; name: string } }[];
}

function toLiveCreditNote(c: ApiCreditNote): LiveCreditNote {
  return {
    id: c.id,
    creditNoteNumber: c.creditNoteNumber,
    status: c.status,
    invoiceId: c.invoiceId,
    invoiceNumber: c.invoice?.invoiceNumber ?? null,
    customerName: c.customerName,
    reason: c.reason,
    subtotal: Number(c.subtotal),
    taxTotal: Number(c.taxTotal),
    total: Number(c.total),
    createdAt: c.createdAt,
    items: c.items.map((i) => ({ productId: i.productId, productName: i.product.name, quantity: i.quantity })),
  };
}

export async function listCreditNotes(): Promise<LiveCreditNote[]> {
  const rows = await apiClient.get<ApiCreditNote[]>('/api/sales/credit-notes');
  return rows.map(toLiveCreditNote);
}

export interface CreateCreditNoteInput {
  invoiceId: string;
  items: DocLineItem[];
  reason: string;
}

export async function createCreditNote(input: CreateCreditNoteInput): Promise<LiveCreditNote> {
  return toLiveCreditNote(await apiClient.post<ApiCreditNote>('/api/sales/credit-notes', input));
}

export async function cancelCreditNote(id: string): Promise<LiveCreditNote> {
  return toLiveCreditNote(await apiClient.post<ApiCreditNote>(`/api/sales/credit-notes/${id}/cancel`, {}));
}

// ---------- Debit Notes ----------

export interface LiveDebitNote {
  id: string;
  debitNoteNumber: string;
  status: CreditDebitStatus;
  invoiceId: string;
  invoiceNumber: string | null;
  customerName: string;
  reason: string;
  amount: number;
  createdAt: string;
}

interface ApiDebitNote {
  id: string;
  debitNoteNumber: string;
  status: CreditDebitStatus;
  invoiceId: string;
  invoice: { id: string; invoiceNumber: string | null };
  customerName: string;
  reason: string;
  amount: string;
  createdAt: string;
}

function toLiveDebitNote(d: ApiDebitNote): LiveDebitNote {
  return {
    id: d.id,
    debitNoteNumber: d.debitNoteNumber,
    status: d.status,
    invoiceId: d.invoiceId,
    invoiceNumber: d.invoice?.invoiceNumber ?? null,
    customerName: d.customerName,
    reason: d.reason,
    amount: Number(d.amount),
    createdAt: d.createdAt,
  };
}

export async function listDebitNotes(): Promise<LiveDebitNote[]> {
  const rows = await apiClient.get<ApiDebitNote[]>('/api/sales/debit-notes');
  return rows.map(toLiveDebitNote);
}

export interface CreateDebitNoteInput {
  invoiceId: string;
  reason: string;
  amount: number;
}

export async function createDebitNote(input: CreateDebitNoteInput): Promise<LiveDebitNote> {
  return toLiveDebitNote(await apiClient.post<ApiDebitNote>('/api/sales/debit-notes', input));
}

export async function cancelDebitNote(id: string): Promise<LiveDebitNote> {
  return toLiveDebitNote(await apiClient.post<ApiDebitNote>(`/api/sales/debit-notes/${id}/cancel`, {}));
}
