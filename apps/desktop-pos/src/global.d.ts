import type { LiveProduct } from './services/api/products';
import type { LiveCategory } from './services/api/categories';
import type { LiveCustomer } from './services/api/customers';
import type { CreateInvoiceInput } from './services/api/invoices';
import type { PendingSale } from './offline/posDB';

declare global {
  interface Window {
    // Exposed by electron/preload.js via contextBridge — the only channel
    // between the renderer and the main-process better-sqlite3 database.
    posDB: {
      getCachedProducts(): Promise<LiveProduct[]>;
      cacheProducts(products: LiveProduct[]): Promise<void>;
      upsertProducts(products: LiveProduct[]): Promise<void>;
      getCachedCategories(): Promise<LiveCategory[]>;
      cacheCategories(categories: LiveCategory[]): Promise<void>;
      getCachedCustomers(): Promise<LiveCustomer[]>;
      cacheCustomers(customers: LiveCustomer[]): Promise<void>;
      decrementCachedStock(productId: string, quantity: number): Promise<void>;
      queueSale(payload: CreateInvoiceInput, idempotencyKey: string): Promise<PendingSale>;
      listPendingSales(): Promise<PendingSale[]>;
      markSaleSynced(id: string): Promise<void>;
      markSaleFailed(id: string, error: string): Promise<void>;
      retrySale(id: string): Promise<void>;
    };
    // electron/preload.js: receipt printers and device telemetry.
    posHardware: {
      sendRawToPrinter(host: string, port: number, bytes: Uint8Array): Promise<boolean>;
      listPrinters(): Promise<string[]>;
      printSystem(deviceName: string): Promise<boolean>;
      deviceInfo(): Promise<{ platform: string; osVersion: string; appVersion: string }>;
    };
  }
}

export {};
