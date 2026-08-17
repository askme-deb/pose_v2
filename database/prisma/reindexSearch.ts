// One-off backfill: pushes everything already in Postgres into Elasticsearch.
// Needed because indexing only happens on new creates/updates going forward
// (see services/inventory-service & services/sales-service's lib/elasticsearch.ts)
// — existing rows from before that code existed, or from `npm run seed`,
// would otherwise never show up in search. Safe to re-run any time the index
// needs rebuilding (e.g. after wiping ES's data volume).
import { PrismaClient } from '@prisma/client';
import { Client } from '@elastic/elasticsearch';

const prisma = new PrismaClient();
const es = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' });

async function reindexProducts() {
  const products = await prisma.product.findMany({ include: { category: true } });
  if (products.length === 0) return 0;
  const stats = await es.helpers.bulk({
    datasource: products,
    onDocument: (p) => [
      { index: { _index: 'pospe_products', _id: p.id } },
      {
        id: p.id,
        tenantId: p.tenantId,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        hsnCode: p.hsnCode,
        price: Number(p.price),
        stockQty: p.stockQty,
        categoryName: p.category?.name ?? null,
      },
    ],
  });
  return stats.total;
}

async function reindexCustomers() {
  const customers = await prisma.customer.findMany();
  if (customers.length === 0) return 0;
  const stats = await es.helpers.bulk({
    datasource: customers,
    onDocument: (c) => [
      { index: { _index: 'pospe_customers', _id: c.id } },
      {
        id: c.id,
        tenantId: c.tenantId,
        name: c.name,
        phone: c.phone,
        email: c.email,
        tier: c.tier,
        loyaltyPoints: c.loyaltyPoints,
      },
    ],
  });
  return stats.total;
}

async function reindexInvoices() {
  const invoices = await prisma.invoice.findMany();
  if (invoices.length === 0) return 0;
  const stats = await es.helpers.bulk({
    datasource: invoices,
    onDocument: (inv) => [
      { index: { _index: 'pospe_invoices', _id: inv.id } },
      {
        id: inv.id,
        storeId: inv.storeId,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        total: Number(inv.total),
        status: inv.status,
        createdAt: inv.createdAt,
      },
    ],
  });
  return stats.total;
}

async function main() {
  const [products, customers, invoices] = await Promise.all([
    reindexProducts(),
    reindexCustomers(),
    reindexInvoices(),
  ]);
  console.log(`Reindexed ${products} products, ${customers} customers, ${invoices} invoices into Elasticsearch.`);
}

main()
  .catch((err) => {
    console.error('Reindex failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
