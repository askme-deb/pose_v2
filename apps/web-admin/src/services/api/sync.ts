import { apiClient } from './client';

export interface SyncDevice {
  id: string;
  deviceId: string;
  label: string | null;
  storeId: string;
  store: { id: string; name: string };
  pendingCount: number;
  lastSyncAt: string | null;
  lastSeenAt: string;
  online: boolean;
}

export type SyncConflictStatus = 'OPEN' | 'RESOLVED';

export interface SyncConflict {
  id: string;
  storeId: string;
  store: { id: string; name: string };
  deviceId: string;
  idempotencyKey: string;
  kind: 'INSUFFICIENT_STOCK';
  reason: string;
  payload: { paymentMethod: string; items: { productId: string; quantity: number }[]; discountPercent: number };
  status: SyncConflictStatus;
  resolvedBy: string | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export function listSyncDevices(): Promise<SyncDevice[]> {
  return apiClient.get<SyncDevice[]>('/api/sync/devices');
}

export function listSyncConflicts(status: SyncConflictStatus | 'ALL' = 'OPEN'): Promise<SyncConflict[]> {
  return apiClient.get<SyncConflict[]>(`/api/sync/conflicts?status=${status}`);
}

export function resolveSyncConflict(id: string, note: string, resolvedBy: string): Promise<SyncConflict> {
  return apiClient.post<SyncConflict>(`/api/sync/conflicts/${id}/resolve`, { note, resolvedBy });
}
