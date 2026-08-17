import Dexie, { type Table } from 'dexie';
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

class OfflineDb extends Dexie {
  products!: Table<LiveProduct, string>;
  categories!: Table<LiveCategory, string>;
  customers!: Table<LiveCustomer, string>;
  pendingSales!: Table<PendingSale, string>;

  constructor() {
    super('pospe-pos-offline');
    this.version(1).stores({
      products: 'id',
      categories: 'id',
      customers: 'id',
      pendingSales: 'id, status, createdAt',
    });
  }
}

export const offlineDb = new OfflineDb();

export async function cacheCatalog(products: LiveProduct[], categories: LiveCategory[], customers: LiveCustomer[]) {
  await offlineDb.transaction('rw', offlineDb.products, offlineDb.categories, offlineDb.customers, async () => {
    await Promise.all([offlineDb.products.clear(), offlineDb.categories.clear(), offlineDb.customers.clear()]);
    await Promise.all([
      offlineDb.products.bulkPut(products),
      offlineDb.categories.bulkPut(categories),
      offlineDb.customers.bulkPut(customers),
    ]);
  });
}

export async function getCachedCatalog(): Promise<{
  products: LiveProduct[];
  categories: LiveCategory[];
  customers: LiveCustomer[];
}> {
  const [products, categories, customers] = await Promise.all([
    offlineDb.products.toArray(),
    offlineDb.categories.toArray(),
    offlineDb.customers.toArray(),
  ]);
  return { products, categories, customers };
}

// Applied immediately when a sale is queued offline, so a second offline sale
// in the same outage checks stock against what's actually left, not stale
// pre-outage numbers.
export async function decrementCachedStock(productId: string, quantity: number) {
  await offlineDb.products
    .where('id')
    .equals(productId)
    .modify((p) => {
      p.stockQty = Math.max(0, p.stockQty - quantity);
    });
}

export async function queueSale(payload: CreateInvoiceInput, idempotencyKey: string): Promise<PendingSale> {
  const sale: PendingSale = {
    id: crypto.randomUUID(),
    idempotencyKey,
    payload,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  await offlineDb.pendingSales.put(sale);
  return sale;
}

export function listPendingSales(): Promise<PendingSale[]> {
  return offlineDb.pendingSales.orderBy('createdAt').toArray();
}

export async function markSaleSynced(id: string) {
  await offlineDb.pendingSales.delete(id);
}

export async function markSaleFailed(id: string, error: string) {
  await offlineDb.pendingSales.update(id, { status: 'failed', error });
}

// Puts a failed sale back in the queue for the next sync pass — the cashier's
// explicit "try again" action after e.g. checking real stock levels.
export async function retrySale(id: string) {
  await offlineDb.pendingSales.update(id, { status: 'pending', error: undefined });
}
