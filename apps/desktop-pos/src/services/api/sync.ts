import { apiClient } from './client';
import type { CreateInvoiceInput } from './invoices';

export interface SyncPushItem {
  idempotencyKey: string;
  queuedAt: string;
  payload: CreateInvoiceInput;
}

export interface SyncPushResult {
  idempotencyKey: string;
  status: 'synced' | 'conflict' | 'error';
  invoice?: unknown;
  conflictId?: string;
  reason?: string;
}

export function pushSync(deviceId: string, storeId: string, label: string, items: SyncPushItem[]) {
  return apiClient.post<{ results: SyncPushResult[] }>('/api/sync/push', { deviceId, storeId, label, items });
}

export function sendHeartbeat(deviceId: string, storeId: string, label: string, pendingCount: number) {
  return apiClient.post('/api/sync/heartbeat', { deviceId, storeId, label, pendingCount });
}
