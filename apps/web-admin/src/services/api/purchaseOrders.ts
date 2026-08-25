import { apiClient } from './client';

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type OrderStatus = 'PENDING' | 'PARTIALLY_RECEIVED' | 'RECEIVED';

export interface LiveSupplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  totalOrders: number;
  outstandingAmount: number;
}

export interface LivePurchaseOrderItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  receivedQty: number;
}

export interface LivePurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: LivePurchaseOrderItem[];
  totalAmount: number;
  expectedDeliveryDate: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
}

interface ApiSupplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  totalOrders: number;
  outstandingAmount: number;
}

interface ApiPoItem {
  productId: string;
  qty: number;
  unitPrice: string;
  receivedQty: number;
  product: { id: string; name: string };
}

interface ApiPurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier: { id: string; name: string };
  items: ApiPoItem[];
  totalAmount: string;
  expectedDeliveryDate: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
}

function toLiveSupplier(s: ApiSupplier): LiveSupplier {
  return {
    id: s.id,
    companyName: s.name,
    contactPerson: s.contactPerson ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    gstin: s.gstin ?? '',
    totalOrders: s.totalOrders,
    outstandingAmount: s.outstandingAmount,
  };
}

function toLivePO(po: ApiPurchaseOrder): LivePurchaseOrder {
  return {
    id: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplier.name,
    items: po.items.map((i) => ({ productId: i.productId, productName: i.product.name, qty: i.qty, unitPrice: Number(i.unitPrice), receivedQty: i.receivedQty })),
    totalAmount: Number(po.totalAmount),
    expectedDeliveryDate: po.expectedDeliveryDate,
    paymentStatus: po.paymentStatus,
    orderStatus: po.orderStatus,
    createdAt: po.createdAt,
  };
}

export async function listSuppliers(): Promise<LiveSupplier[]> {
  const suppliers = await apiClient.get<ApiSupplier[]>('/api/purchase/suppliers');
  return suppliers.map(toLiveSupplier);
}

export interface SupplierInput {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

export async function createSupplier(input: SupplierInput): Promise<LiveSupplier> {
  const supplier = await apiClient.post<ApiSupplier>('/api/purchase/suppliers', input);
  return toLiveSupplier(supplier);
}

export async function listPurchaseOrders(): Promise<LivePurchaseOrder[]> {
  const orders = await apiClient.get<ApiPurchaseOrder[]>('/api/purchase/purchase-orders');
  return orders.map(toLivePO);
}

export interface PurchaseOrderInput {
  supplierId: string;
  items: { productId: string; qty: number; unitPrice: number }[];
  expectedDeliveryDate: string;
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus;
}

export async function createPurchaseOrder(input: PurchaseOrderInput): Promise<LivePurchaseOrder> {
  const order = await apiClient.post<ApiPurchaseOrder>('/api/purchase/purchase-orders', input);
  return toLivePO(order);
}

export async function receivePurchaseOrder(id: string): Promise<LivePurchaseOrder> {
  const order = await apiClient.post<ApiPurchaseOrder>(`/api/purchase/purchase-orders/${id}/receive`, {});
  return toLivePO(order);
}

// ---------- Goods Received Notes ----------

export interface LiveGrnItem {
  productId: string;
  productName: string;
  productSku: string;
  receivedQty: number;
}

export interface LiveGrn {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  receivedBy: string;
  notes: string | null;
  createdAt: string;
  items: LiveGrnItem[];
}

interface ApiGrn {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  purchaseOrder: { id: string; poNumber: string };
  supplierId: string;
  supplier: { id: string; name: string };
  receivedBy: string;
  notes: string | null;
  createdAt: string;
  items: { productId: string; receivedQty: number; product: { id: string; name: string; sku: string } }[];
}

function toLiveGrn(g: ApiGrn): LiveGrn {
  return {
    id: g.id,
    grnNumber: g.grnNumber,
    purchaseOrderId: g.purchaseOrderId,
    poNumber: g.purchaseOrder.poNumber,
    supplierId: g.supplierId,
    supplierName: g.supplier.name,
    receivedBy: g.receivedBy,
    notes: g.notes,
    createdAt: g.createdAt,
    items: g.items.map((i) => ({ productId: i.productId, productName: i.product.name, productSku: i.product.sku, receivedQty: i.receivedQty })),
  };
}

export async function listGrns(): Promise<LiveGrn[]> {
  const rows = await apiClient.get<ApiGrn[]>('/api/purchase/grns');
  return rows.map(toLiveGrn);
}

export interface ReceiveGoodsInput {
  purchaseOrderId: string;
  items: {
    productId: string;
    receivedQty: number;
    batch?: { batchNumber: string; expiryDate?: string };
    serialNumbers?: string[];
  }[];
  receivedBy: string;
  notes?: string;
}

export async function createGrn(input: ReceiveGoodsInput): Promise<LiveGrn> {
  return toLiveGrn(await apiClient.post<ApiGrn>('/api/purchase/grns', input));
}

// ---------- Purchase Returns ----------

export interface LiveReturnItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
}

export type PurchaseReturnStatus = 'ISSUED' | 'CANCELLED';

export interface LivePurchaseReturn {
  id: string;
  returnNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  reason: string;
  status: PurchaseReturnStatus;
  totalValue: number;
  createdAt: string;
  items: LiveReturnItem[];
}

interface ApiPurchaseReturn {
  id: string;
  returnNumber: string;
  purchaseOrderId: string;
  purchaseOrder: { id: string; poNumber: string };
  supplierId: string;
  supplier: { id: string; name: string };
  reason: string;
  status: PurchaseReturnStatus;
  totalValue: string;
  createdAt: string;
  items: { productId: string; quantity: number; unitPrice: string; product: { id: string; name: string; sku: string } }[];
}

function toLiveReturn(r: ApiPurchaseReturn): LivePurchaseReturn {
  return {
    id: r.id,
    returnNumber: r.returnNumber,
    purchaseOrderId: r.purchaseOrderId,
    poNumber: r.purchaseOrder.poNumber,
    supplierId: r.supplierId,
    supplierName: r.supplier.name,
    reason: r.reason,
    status: r.status,
    totalValue: Number(r.totalValue),
    createdAt: r.createdAt,
    items: r.items.map((i) => ({ productId: i.productId, productName: i.product.name, productSku: i.product.sku, quantity: i.quantity, unitPrice: Number(i.unitPrice) })),
  };
}

export async function listPurchaseReturns(): Promise<LivePurchaseReturn[]> {
  const rows = await apiClient.get<ApiPurchaseReturn[]>('/api/purchase/purchase-returns');
  return rows.map(toLiveReturn);
}

export interface CreatePurchaseReturnInput {
  purchaseOrderId: string;
  items: { productId: string; quantity: number }[];
  reason: string;
}

export async function createPurchaseReturn(input: CreatePurchaseReturnInput): Promise<LivePurchaseReturn> {
  return toLiveReturn(await apiClient.post<ApiPurchaseReturn>('/api/purchase/purchase-returns', input));
}

// ---------- Vendor Ledger ----------

export type SupplierPaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE';

export interface LedgerEntry {
  type: 'PURCHASE_ORDER' | 'PAYMENT' | 'RETURN';
  id: string;
  label: string;
  amount: number;
  date: string;
  balance: number;
}

export interface SupplierLedger {
  supplier: { id: string; name: string };
  entries: LedgerEntry[];
  currentBalance: number;
}

export async function getSupplierLedger(supplierId: string): Promise<SupplierLedger> {
  return apiClient.get<SupplierLedger>(`/api/purchase/suppliers/${supplierId}/ledger`);
}

export interface RecordPaymentInput {
  amount: number;
  method: SupplierPaymentMethod;
  reference?: string;
  notes?: string;
}

export async function recordSupplierPayment(supplierId: string, input: RecordPaymentInput): Promise<void> {
  await apiClient.post(`/api/purchase/suppliers/${supplierId}/payments`, input);
}
