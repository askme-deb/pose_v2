export interface PurchaseOrderItem {
  productId: string;
  qty: number;
  unitPrice: number;
}

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type OrderStatus = 'pending' | 'received';

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  expectedDeliveryDate: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
}

export const lineTotal = (items: PurchaseOrderItem[]): number =>
  items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

const rawOrders: Array<Omit<PurchaseOrder, 'totalAmount'>> = [
  {
    id: 'PO-8041',
    supplierId: 'sup-amul-dairy',
    items: [
      { productId: 'prd-001', qty: 200, unitPrice: 58 },
      { productId: 'prd-008', qty: 100, unitPrice: 74 },
    ],
    expectedDeliveryDate: '2026-08-05',
    paymentStatus: 'paid',
    orderStatus: 'received',
    createdAt: '2026-07-30T10:15:00+05:30',
  },
  {
    id: 'PO-8042',
    supplierId: 'sup-britannia',
    items: [
      { productId: 'prd-005', qty: 300, unitPrice: 36 },
      { productId: 'prd-010', qty: 150, unitPrice: 42 },
    ],
    expectedDeliveryDate: '2026-08-10',
    paymentStatus: 'partial',
    orderStatus: 'pending',
    createdAt: '2026-08-02T09:40:00+05:30',
  },
  {
    id: 'PO-8043',
    supplierId: 'sup-nestle',
    items: [
      { productId: 'prd-004', qty: 120, unitPrice: 231 },
      { productId: 'prd-009', qty: 200, unitPrice: 39 },
    ],
    expectedDeliveryDate: '2026-08-01',
    paymentStatus: 'paid',
    orderStatus: 'received',
    createdAt: '2026-07-28T14:05:00+05:30',
  },
  {
    id: 'PO-8044',
    supplierId: 'sup-mondelez',
    items: [{ productId: 'prd-003', qty: 400, unitPrice: 72 }],
    expectedDeliveryDate: '2026-08-12',
    paymentStatus: 'unpaid',
    orderStatus: 'pending',
    createdAt: '2026-08-05T11:22:00+05:30',
  },
  {
    id: 'PO-8045',
    supplierId: 'sup-cocacola',
    items: [
      { productId: 'prd-006', qty: 600, unitPrice: 31 },
      { productId: 'prd-012', qty: 250, unitPrice: 35 },
    ],
    expectedDeliveryDate: '2026-08-03',
    paymentStatus: 'paid',
    orderStatus: 'received',
    createdAt: '2026-07-29T08:50:00+05:30',
  },
  {
    id: 'PO-8046',
    supplierId: 'sup-haldirams',
    items: [
      { productId: 'prd-007', qty: 180, unitPrice: 50 },
      { productId: 'prd-011', qty: 80, unitPrice: 165 },
    ],
    expectedDeliveryDate: '2026-08-14',
    paymentStatus: 'partial',
    orderStatus: 'pending',
    createdAt: '2026-08-07T16:12:00+05:30',
  },
  {
    id: 'PO-8047',
    supplierId: 'sup-amul-dairy',
    items: [{ productId: 'prd-002', qty: 150, unitPrice: 98 }],
    expectedDeliveryDate: '2026-07-31',
    paymentStatus: 'paid',
    orderStatus: 'received',
    createdAt: '2026-07-25T09:00:00+05:30',
  },
  {
    id: 'PO-8048',
    supplierId: 'sup-britannia',
    items: [
      { productId: 'prd-005', qty: 220, unitPrice: 36 },
      { productId: 'prd-010', qty: 100, unitPrice: 42 },
    ],
    expectedDeliveryDate: '2026-08-16',
    paymentStatus: 'unpaid',
    orderStatus: 'pending',
    createdAt: '2026-08-10T13:35:00+05:30',
  },
];

export const purchaseOrders: PurchaseOrder[] = rawOrders.map((po) => ({ ...po, totalAmount: lineTotal(po.items) }));
