import { apiClient } from './client';

export type AdjustmentAction = 'ADD' | 'SUBTRACT';
export type AdjustmentStatus = 'PENDING' | 'APPROVED';

export interface LiveStockAdjustment {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  action: AdjustmentAction;
  qty: number;
  reasonCode: string;
  auditor: string;
  valueImpact: number;
  status: AdjustmentStatus;
  createdAt: string;
}

interface ApiStockAdjustment {
  id: string;
  productId: string;
  product: { id: string; name: string; sku: string };
  action: AdjustmentAction;
  qty: number;
  reasonCode: string;
  auditor: string;
  valueImpact: string;
  status: AdjustmentStatus;
  createdAt: string;
}

function toLive(a: ApiStockAdjustment): LiveStockAdjustment {
  return {
    id: a.id,
    productId: a.productId,
    productName: a.product.name,
    productSku: a.product.sku,
    action: a.action,
    qty: a.qty,
    reasonCode: a.reasonCode,
    auditor: a.auditor,
    valueImpact: Number(a.valueImpact),
    status: a.status,
    createdAt: a.createdAt,
  };
}

export async function listStockAdjustments(): Promise<LiveStockAdjustment[]> {
  const rows = await apiClient.get<ApiStockAdjustment[]>('/api/inventory/stock-adjustments');
  return rows.map(toLive);
}

export interface StockAdjustmentInput {
  productId: string;
  action: AdjustmentAction;
  qty: number;
  reasonCode: string;
  auditor: string;
}

export async function createStockAdjustment(input: StockAdjustmentInput): Promise<LiveStockAdjustment> {
  const row = await apiClient.post<ApiStockAdjustment>('/api/inventory/stock-adjustments', input);
  return toLive(row);
}

export async function approveStockAdjustment(id: string): Promise<LiveStockAdjustment> {
  const row = await apiClient.post<ApiStockAdjustment>(`/api/inventory/stock-adjustments/${id}/approve`, {});
  return toLive(row);
}
