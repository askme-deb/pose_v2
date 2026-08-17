import { listPendingSales, markSaleSynced, markSaleFailed, cacheCatalog } from '../db/offlineDb';
import { createInvoice, parseCheckoutError } from '../services/api/invoices';
import { listProducts } from '../services/api/products';
import { listCategories } from '../services/api/categories';
import { listCustomers } from '../services/api/customers';

export interface SyncResult {
  synced: number;
  failed: number;
}

let syncing = false;

// Replays queued offline sales in the order they were made. A sale already
// marked 'failed' (e.g. sold out while this device was offline) is left for
// manual resolution rather than retried forever — that's this pass's answer
// to "conflict resolution": surface it honestly, don't silently drop or
// auto-merge it.
export async function runSync(): Promise<SyncResult> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const pending = await listPendingSales();
    for (const sale of pending) {
      if (sale.status === 'failed') continue;
      try {
        await createInvoice(sale.payload, sale.idempotencyKey);
        await markSaleSynced(sale.id);
        synced++;
      } catch (err) {
        await markSaleFailed(sale.id, parseCheckoutError(err));
        failed++;
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
