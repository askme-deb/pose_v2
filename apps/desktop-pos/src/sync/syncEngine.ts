import { listPendingSales, markSaleSynced, markSaleFailed, cacheCatalog } from '../offline/posDB';
import { listProducts } from '../services/api/products';
import { listCategories } from '../services/api/categories';
import { listCustomers } from '../services/api/customers';
import { pushSync, sendHeartbeat } from '../services/api/sync';
import { getDeviceId } from './deviceId';
import { collectTelemetry } from './telemetry';
import { usePosSessionStore } from '../store/usePosSessionStore';

export interface SyncResult {
  synced: number;
  failed: number;
}

let syncing = false;

// Replays queued offline sales as one batch through synchronization-service,
// which replays them in the order they were actually made and — the real
// conflict-resolution step this used to skip — records a durable,
// server-visible SyncConflict when two terminals raced for the same stock,
// instead of just leaving the failure in this one device's local queue.
export async function runSync(): Promise<SyncResult> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const pending = await listPendingSales();
    const toSync = pending.filter((s) => s.status === 'pending');
    const { storeId, session } = usePosSessionStore.getState();

    if (toSync.length > 0 && storeId) {
      try {
        const { results } = await pushSync(
          getDeviceId(),
          storeId,
          session?.registerName ?? 'POS Terminal',
          toSync.map((s) => ({ idempotencyKey: s.idempotencyKey, queuedAt: s.createdAt, payload: s.payload })),
        );
        const byKey = new Map(results.map((r) => [r.idempotencyKey, r]));
        for (const sale of toSync) {
          const result = byKey.get(sale.idempotencyKey);
          if (!result || result.status === 'error') continue; // stays 'pending' — retried next pass
          if (result.status === 'synced') {
            await markSaleSynced(sale.id);
            synced++;
          } else {
            await markSaleFailed(sale.id, result.reason ?? 'Sync conflict');
            failed++;
          }
        }
      } catch {
        // Couldn't reach sync-service at all (still offline) — everything
        // stays 'pending' for the next pass.
      }
    }

    try {
      const [products, categories, customers] = await Promise.all([listProducts(), listCategories(), listCustomers()]);
      await cacheCatalog(products, categories, customers);
    } catch {
      // Catalog refresh is best-effort — the sales above already synced.
    }
  } finally {
    syncing = false;
  }
  return { synced, failed };
}

export function startAutoSync(onDone?: (result: SyncResult) => void): () => void {
  const handler = () => {
    runSync().then((result) => onDone?.(result));
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}

const HEARTBEAT_INTERVAL_MS = 30_000;

// So a manager's sync-status view can tell "quiet shift, nothing to sync"
// apart from "this terminal's been off for three hours" — a push only
// happens when there's something to replay.
export function startHeartbeat(): () => void {
  const tick = async () => {
    const { storeId, session, token } = usePosSessionStore.getState();
    if (!storeId || !token || !navigator.onLine) return;
    try {
      const [pending, telemetry] = await Promise.all([listPendingSales(), collectTelemetry()]);
      await sendHeartbeat(
        getDeviceId(),
        storeId,
        session?.registerName ?? 'POS Terminal',
        pending.filter((s) => s.status === 'pending').length,
        telemetry,
      );
    } catch {
      // Best-effort — a missed heartbeat just makes this device look briefly offline to admins.
    }
  };
  tick();
  const interval = window.setInterval(tick, HEARTBEAT_INTERVAL_MS);
  return () => window.clearInterval(interval);
}
