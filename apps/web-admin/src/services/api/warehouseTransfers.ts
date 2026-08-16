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
