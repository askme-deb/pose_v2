import type { LiveProduct } from '../services/api/products';
import type { LiveCategory } from '../services/api/categories';
import type { LiveCustomer } from '../services/api/customers';
import type { CreateInvoiceInput } from '../services/api/invoices';

export interface PendingSale {
  id: string;
  idempotencyKey: string;
  payload: CreateInvoiceInput;
  createdAt: string;
  status: 'pending' | 'failed';
  error?: string;
}

// Same surface as web-pos's src/db/offlineDb.ts (Dexie-backed) — everything
// here is a thin call into the main process's real better-sqlite3 database
// via the preload bridge, so PosTouchPage/PosShell/syncEngine need only their
// import path changed, not their control flow.

export async function cacheCatalog(products: LiveProduct[], categories: LiveCategory[], customers: LiveCustomer[]) {
  await Promise.all([
    window.posDB.cacheProducts(products),
    window.posDB.cacheCategories(categories),
    window.posDB.cacheCustomers(customers),
  ]);
}

export async function getCachedCatalog(): Promise<{
  products: LiveProduct[];
  categories: LiveCategory[];
  customers: LiveCustomer[];
}> {
  const [products, categories, customers] = await Promise.all([
    window.posDB.getCachedProducts(),
    window.posDB.getCachedCategories(),
    window.posDB.getCachedCustomers(),
  ]);
  return { products, categories, customers };
}

export function decrementCachedStock(productId: string, quantity: number): Promise<void> {
  return window.posDB.decrementCachedStock(productId, quantity);
}

export function queueSale(payload: CreateInvoiceInput, idempotencyKey: string): Promise<PendingSale> {
  return window.posDB.queueSale(payload, idempotencyKey);
}

export function listPendingSales(): Promise<PendingSale[]> {
  return window.posDB.listPendingSales();
}

export function markSaleSynced(id: string): Promise<void> {
  return window.posDB.markSaleSynced(id);
}

export function markSaleFailed(id: string, error: string): Promise<void> {
  return window.posDB.markSaleFailed(id, error);
}

export function retrySale(id: string): Promise<void> {
  return window.posDB.retrySale(id);
}
