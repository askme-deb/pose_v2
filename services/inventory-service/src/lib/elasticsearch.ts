import { Client } from '@elastic/elasticsearch';
import type { Prisma } from '@prisma/client';

export const esClient = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' });

export const PRODUCTS_INDEX = 'pospe_products';

interface IndexableProduct {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  barcode: string | null;
  hsnCode: string | null;
  price: Prisma.Decimal | number | string;
  stockQty: number;
  categoryName?: string;
}

// Best-effort — a slow/down Elasticsearch must never fail or block the
// product write that triggered it. Same fire-and-forget posture as
// notifyLowStock (@pospe/notifications).
export function indexProduct(product: IndexableProduct): void {
  esClient
    .index({
      index: PRODUCTS_INDEX,
      id: product.id,
      document: {
        id: product.id,
        tenantId: product.tenantId,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        hsnCode: product.hsnCode,
        price: Number(product.price),
        stockQty: product.stockQty,
        categoryName: product.categoryName ?? null,
      },
    })
    .catch(() => {});
}

export function deleteProductFromIndex(id: string): void {
  esClient.delete({ index: PRODUCTS_INDEX, id }).catch(() => {});
}
