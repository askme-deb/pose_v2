import { apiClient } from './client';

// ---------- Bundles ----------

export interface BundleItem {
  id: string;
  bundleProductId: string;
  componentProductId: string;
  componentProductName: string;
  componentProductSku: string;
  componentPrice: number;
  quantity: number;
}

interface ApiBundleItem {
  id: string;
  bundleProductId: string;
  componentProductId: string;
  quantity: number;
  componentProduct: { id: string; name: string; sku: string; price: string };
}

function toBundleItem(b: ApiBundleItem): BundleItem {
  return {
    id: b.id,
    bundleProductId: b.bundleProductId,
    componentProductId: b.componentProductId,
    componentProductName: b.componentProduct.name,
    componentProductSku: b.componentProduct.sku,
    componentPrice: Number(b.componentProduct.price),
    quantity: b.quantity,
  };
}

export async function listBundleItems(productId: string): Promise<BundleItem[]> {
  const rows = await apiClient.get<ApiBundleItem[]>(`/api/inventory/products/${productId}/bundle-items`);
  return rows.map(toBundleItem);
}

export async function setBundleItems(productId: string, items: { componentProductId: string; quantity: number }[]): Promise<BundleItem[]> {
  const rows = await apiClient.put<ApiBundleItem[]>(`/api/inventory/products/${productId}/bundle-items`, { items });
  return rows.map(toBundleItem);
}

export async function clearBundleItems(productId: string): Promise<void> {
  await apiClient.delete(`/api/inventory/products/${productId}/bundle-items`);
}

// ---------- Batches ----------

export interface ProductBatchRow {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  batchNumber: string;
  quantity: number;
  costPrice: number;
  expiryDate: string | null;
  receivedAt: string;
}

interface ApiBatch {
  id: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  costPrice: string;
  expiryDate: string | null;
  receivedAt: string;
  product: { id: string; name: string; sku: string };
}

function toBatch(b: ApiBatch): ProductBatchRow {
  return {
    id: b.id,
    productId: b.productId,
    productName: b.product.name,
    productSku: b.product.sku,
    batchNumber: b.batchNumber,
    quantity: b.quantity,
    costPrice: Number(b.costPrice),
    expiryDate: b.expiryDate,
    receivedAt: b.receivedAt,
  };
}

export async function listProductBatches(productId: string): Promise<ProductBatchRow[]> {
  const rows = await apiClient.get<ApiBatch[]>(`/api/inventory/products/${productId}/batches`);
  return rows.map(toBatch);
}

export async function listExpiringBatches(days: number): Promise<ProductBatchRow[]> {
  const rows = await apiClient.get<ApiBatch[]>(`/api/inventory/batches/expiring?days=${days}`);
  return rows.map(toBatch);
}

export async function adjustBatch(batchId: string, quantity: number, reason: string): Promise<ProductBatchRow> {
  return toBatch(await apiClient.post<ApiBatch>(`/api/inventory/batches/${batchId}/adjust`, { quantity, reason }));
}

// ---------- Serials ----------

export type SerialStatus = 'IN_STOCK' | 'SOLD' | 'RETURNED' | 'DAMAGED';

export interface ProductSerialRow {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  serialNumber: string;
  status: SerialStatus;
  invoiceId: string | null;
  createdAt: string;
}

interface ApiSerial {
  id: string;
  productId: string;
  serialNumber: string;
  status: SerialStatus;
  invoiceId: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string };
}

function toSerial(s: ApiSerial): ProductSerialRow {
  return {
    id: s.id,
    productId: s.productId,
    productName: s.product.name,
    productSku: s.product.sku,
    serialNumber: s.serialNumber,
    status: s.status,
    invoiceId: s.invoiceId,
    createdAt: s.createdAt,
  };
}

export async function listProductSerials(productId: string, status?: SerialStatus): Promise<ProductSerialRow[]> {
  const rows = await apiClient.get<ApiSerial[]>(`/api/inventory/products/${productId}/serials${status ? `?status=${status}` : ''}`);
  return rows.map(toSerial);
}

export async function searchSerials(q: string): Promise<ProductSerialRow[]> {
  const rows = await apiClient.get<ApiSerial[]>(`/api/inventory/serials/search?q=${encodeURIComponent(q)}`);
  return rows.map(toSerial);
}

export async function markSerial(serialId: string, status: 'IN_STOCK' | 'RETURNED' | 'DAMAGED'): Promise<ProductSerialRow> {
  return toSerial(await apiClient.post<ApiSerial>(`/api/inventory/serials/${serialId}/mark`, { status }));
}

// ---------- GRN batch/serial capture ----------

export interface ReceiveLineExtra {
  batch?: { batchNumber: string; expiryDate?: string };
  serialNumbers?: string[];
}

// ---------- Dead stock report ----------

export interface DeadStockProduct {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  stockQty: number;
  costPrice: number;
  capitalTiedUp: number;
  lastSoldAt: string | null;
}

export interface DeadStockReport {
  windowDays: number;
  count: number;
  totalCapitalTiedUp: number;
  products: DeadStockProduct[];
}

export async function getDeadStockReport(days: number): Promise<DeadStockReport> {
  return apiClient.get<DeadStockReport>(`/api/inventory/reports/dead-stock?days=${days}`);
}
