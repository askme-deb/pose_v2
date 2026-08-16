import { products } from './products';

export type AdjustmentAction = 'add' | 'subtract';
export type AdjustmentStatus = 'pending' | 'approved';

export interface StockAdjustment {
  id: string;
  productId: string;
  action: AdjustmentAction;
  qty: number;
  reasonCode: string;
  auditor: string;
  valueImpact: number;
  status: AdjustmentStatus;
  createdAt: string;
}

export const reasonCodeOptions = [
  { value: 'Expired / Damaged', label: 'Expired / Damaged' },
  { value: 'Audit Variance Correction', label: 'Audit Variance Correction' },
  { value: 'Store Consumption / Tasting', label: 'Store Consumption / Tasting' },
  { value: 'Shrinkage / Missing', label: 'Shrinkage / Missing' },
];

function costOf(productId: string): number {
  return products.find((p) => p.id === productId)?.costPrice ?? 0;
}

function impact(productId: string, action: AdjustmentAction, qty: number): number {
  const signed = action === 'add' ? qty : -qty;
  return signed * costOf(productId);
}

export const stockAdjustments: StockAdjustment[] = [
  { id: 'adj-001', productId: 'prd-005', action: 'subtract', qty: 40, reasonCode: 'Expired / Damaged', auditor: 'Rohit Sharma', valueImpact: impact('prd-005', 'subtract', 40), status: 'approved', createdAt: '2026-08-01T10:15:00+05:30' },
  { id: 'adj-002', productId: 'prd-012', action: 'subtract', qty: 15, reasonCode: 'Shrinkage / Missing', auditor: 'Priya Nair', valueImpact: impact('prd-012', 'subtract', 15), status: 'approved', createdAt: '2026-08-03T14:30:00+05:30' },
  { id: 'adj-003', productId: 'prd-009', action: 'subtract', qty: 12, reasonCode: 'Store Consumption / Tasting', auditor: 'Manager Alex', valueImpact: impact('prd-009', 'subtract', 12), status: 'pending', createdAt: '2026-08-05T09:00:00+05:30' },
  { id: 'adj-004', productId: 'prd-003', action: 'subtract', qty: 8, reasonCode: 'Expired / Damaged', auditor: 'Rohit Sharma', valueImpact: impact('prd-003', 'subtract', 8), status: 'approved', createdAt: '2026-08-06T11:45:00+05:30' },
  { id: 'adj-005', productId: 'prd-001', action: 'add', qty: 60, reasonCode: 'Audit Variance Correction', auditor: 'Sunita Rao', valueImpact: impact('prd-001', 'add', 60), status: 'approved', createdAt: '2026-08-07T08:20:00+05:30' },
  { id: 'adj-006', productId: 'prd-007', action: 'subtract', qty: 10, reasonCode: 'Shrinkage / Missing', auditor: 'Priya Nair', valueImpact: impact('prd-007', 'subtract', 10), status: 'pending', createdAt: '2026-08-09T16:10:00+05:30' },
  { id: 'adj-007', productId: 'prd-013', action: 'subtract', qty: 25, reasonCode: 'Expired / Damaged', auditor: 'Manager Alex', valueImpact: impact('prd-013', 'subtract', 25), status: 'approved', createdAt: '2026-08-10T12:00:00+05:30' },
  { id: 'adj-008', productId: 'prd-002', action: 'add', qty: 20, reasonCode: 'Audit Variance Correction', auditor: 'Sunita Rao', valueImpact: impact('prd-002', 'add', 20), status: 'approved', createdAt: '2026-08-12T10:30:00+05:30' },
  { id: 'adj-009', productId: 'prd-011', action: 'subtract', qty: 18, reasonCode: 'Shrinkage / Missing', auditor: 'Rohit Sharma', valueImpact: impact('prd-011', 'subtract', 18), status: 'pending', createdAt: '2026-08-14T09:50:00+05:30' },
  { id: 'adj-010', productId: 'prd-006', action: 'add', qty: 100, reasonCode: 'Audit Variance Correction', auditor: 'Priya Nair', valueImpact: impact('prd-006', 'add', 100), status: 'approved', createdAt: '2026-08-15T13:15:00+05:30' },
];
