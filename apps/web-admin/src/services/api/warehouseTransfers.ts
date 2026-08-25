import { apiClient } from './client';

export type TransferStatus = 'IN_TRANSIT' | 'COMPLETED';

export interface LiveWarehouse {
  id: string;
  facilityName: string;
  facilityCode: string;
  totalRacks: number;
  address: string;
  manager: string;
}

export interface LiveTransferItem {
  productId: string;
  productName: string;
  qty: number;
}

export interface LiveTransfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  items: LiveTransferItem[];
  totalValuation: number;
  carrier: string;
  status: TransferStatus;
  createdAt: string;
}

interface ApiWarehouse {
  id: string;
  name: string;
  code: string | null;
  totalRacks: number;
  address: string | null;
  manager: string | null;
}

interface ApiTransferItem {
  productId: string;
  qty: number;
  product: { id: string; name: string };
}

interface ApiTransfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouse: { id: string; name: string };
  destinationWarehouseId: string;
  destinationWarehouse: { id: string; name: string };
  items: ApiTransferItem[];
  totalValuation: string;
  carrier: string | null;
  status: TransferStatus;
  createdAt: string;
}

function toLiveWarehouse(w: ApiWarehouse): LiveWarehouse {
  return {
    id: w.id,
    facilityName: w.name,
    facilityCode: w.code ?? '',
    totalRacks: w.totalRacks,
    address: w.address ?? '',
    manager: w.manager ?? '',
  };
}

function toLiveTransfer(t: ApiTransfer): LiveTransfer {
  return {
    id: t.id,
    transferNumber: t.transferNumber,
    sourceWarehouseId: t.sourceWarehouseId,
    sourceWarehouseName: t.sourceWarehouse.name,
    destinationWarehouseId: t.destinationWarehouseId,
    destinationWarehouseName: t.destinationWarehouse.name,
    items: t.items.map((i) => ({ productId: i.productId, productName: i.product.name, qty: i.qty })),
    totalValuation: Number(t.totalValuation),
    carrier: t.carrier ?? '',
    status: t.status,
    createdAt: t.createdAt,
  };
}

export async function listWarehouses(): Promise<LiveWarehouse[]> {
  const warehouses = await apiClient.get<ApiWarehouse[]>('/api/inventory/warehouses');
  return warehouses.map(toLiveWarehouse);
}

export interface WarehouseInput {
  name: string;
  code?: string;
  totalRacks?: number;
  address?: string;
  manager?: string;
}

export async function createWarehouse(input: WarehouseInput): Promise<LiveWarehouse> {
  const warehouse = await apiClient.post<ApiWarehouse>('/api/inventory/warehouses', input);
  return toLiveWarehouse(warehouse);
}

export async function listTransfers(): Promise<LiveTransfer[]> {
  const transfers = await apiClient.get<ApiTransfer[]>('/api/inventory/warehouse-transfers');
  return transfers.map(toLiveTransfer);
}

export interface TransferInput {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  items: { productId: string; qty: number }[];
  carrier?: string;
}

export async function createTransfer(input: TransferInput): Promise<LiveTransfer> {
  const transfer = await apiClient.post<ApiTransfer>('/api/inventory/warehouse-transfers', input);
  return toLiveTransfer(transfer);
}

export async function completeTransfer(id: string): Promise<LiveTransfer> {
  const transfer = await apiClient.post<ApiTransfer>(`/api/inventory/warehouse-transfers/${id}/complete`, {});
  return toLiveTransfer(transfer);
}

// ---------- Racks ----------

export interface RackItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
}

export interface Rack {
  id: string;
  warehouseId: string;
  code: string;
  capacity: number | null;
  items: RackItem[];
}

interface ApiRack {
  id: string;
  warehouseId: string;
  code: string;
  capacity: number | null;
  items: { productId: string; quantity: number; product: { id: string; name: string; sku: string } }[];
}

function toRack(r: ApiRack): Rack {
  return {
    id: r.id,
    warehouseId: r.warehouseId,
    code: r.code,
    capacity: r.capacity,
    items: r.items.map((i) => ({ productId: i.productId, productName: i.product.name, productSku: i.product.sku, quantity: i.quantity })),
  };
}

export async function listRacks(warehouseId: string): Promise<Rack[]> {
  const rows = await apiClient.get<ApiRack[]>(`/api/inventory/warehouses/${warehouseId}/racks`);
  return rows.map(toRack);
}

export async function createRack(warehouseId: string, code: string, capacity?: number): Promise<Rack> {
  return toRack(await apiClient.post<ApiRack>(`/api/inventory/warehouses/${warehouseId}/racks`, { code, capacity }));
}

export async function deleteRack(rackId: string): Promise<void> {
  await apiClient.delete(`/api/inventory/racks/${rackId}`);
}

export async function assignToRack(rackId: string, productId: string, quantity: number): Promise<void> {
  await apiClient.post(`/api/inventory/racks/${rackId}/assign`, { productId, quantity });
}

export interface RackLocation {
  rackId: string;
  rackCode: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

export async function getProductRackLocations(productId: string): Promise<RackLocation[]> {
  return apiClient.get<RackLocation[]>(`/api/inventory/products/${productId}/rack-locations`);
}

// ---------- Damage reports ----------

export interface DamageReport {
  id: string;
  warehouseId: string;
  warehouseName: string;
  rackId: string | null;
  rackCode: string | null;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  reason: string;
  reportedBy: string;
  valueImpact: number;
  createdAt: string;
}

interface ApiDamageReport {
  id: string;
  warehouseId: string;
  warehouse: { id: string; name: string };
  rackId: string | null;
  rack: { id: string; code: string } | null;
  productId: string;
  product: { id: string; name: string; sku: string };
  quantity: number;
  reason: string;
  reportedBy: string;
  valueImpact: string;
  createdAt: string;
}

function toDamageReport(d: ApiDamageReport): DamageReport {
  return {
    id: d.id,
    warehouseId: d.warehouseId,
    warehouseName: d.warehouse.name,
    rackId: d.rackId,
    rackCode: d.rack?.code ?? null,
    productId: d.productId,
    productName: d.product.name,
    productSku: d.product.sku,
    quantity: d.quantity,
    reason: d.reason,
    reportedBy: d.reportedBy,
    valueImpact: Number(d.valueImpact),
    createdAt: d.createdAt,
  };
}

export async function listDamageReports(warehouseId?: string): Promise<DamageReport[]> {
  const rows = await apiClient.get<ApiDamageReport[]>(`/api/inventory/warehouse-damage-reports${warehouseId ? `?warehouseId=${warehouseId}` : ''}`);
  return rows.map(toDamageReport);
}

export interface CreateDamageReportInput {
  warehouseId: string;
  rackId?: string;
  productId: string;
  quantity: number;
  reason: string;
  reportedBy: string;
}

export async function createDamageReport(input: CreateDamageReportInput): Promise<DamageReport> {
  return toDamageReport(await apiClient.post<ApiDamageReport>('/api/inventory/warehouse-damage-reports', input));
}
