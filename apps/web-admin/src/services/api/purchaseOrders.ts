import { apiClient } from './client';

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type OrderStatus = 'PENDING' | 'RECEIVED';

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
    items: po.items.map((i) => ({ productId: i.productId, productName: i.product.name, qty: i.qty, unitPrice: Number(i.unitPrice) })),
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
