import { Router } from 'express';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

// Same pragmatic cross-domain read sales-service's own /gst-summary already
// uses against purchase-service's tables — services share one Postgres
// database in this scaffold, so reading Invoice/InvoiceItem directly here
// beats standing up a real service-to-service call for one report.
router.get('/reports/dead-stock', requirePermission('report:view'), async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const days = Math.max(1, Number(req.query.days) || 90);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const products = await prisma.product.findMany({
    where: { tenantId, isBundle: false },
    include: { category: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  const recentlySold = await prisma.invoiceItem.findMany({
    where: { invoice: { status: 'PAID', createdAt: { gte: cutoff }, store: { tenantId } } },
    select: { productId: true },
    distinct: ['productId'],
  });
  const recentlySoldIds = new Set(recentlySold.map((i) => i.productId));

  const lastSaleByProduct = await prisma.invoiceItem.groupBy({
    by: ['productId'],
    where: { invoice: { status: 'PAID', store: { tenantId } } },
    _max: { invoiceId: true },
  });
  // groupBy can't give us MAX(invoice.createdAt) directly across a relation,
  // so pull the actual last-sale timestamps in a second, targeted query.
  const lastInvoiceIds = lastSaleByProduct.map((g) => g._max.invoiceId).filter((id): id is string => !!id);
  const lastInvoices = await prisma.invoice.findMany({
    where: { id: { in: lastInvoiceIds }, store: { tenantId } },
    select: { id: true, createdAt: true },
  });
  const invoiceDateById = new Map(lastInvoices.map((i) => [i.id, i.createdAt]));
  const lastSoldAtByProduct = new Map(
    lastSaleByProduct
      .filter((g) => g._max.invoiceId)
      .map((g) => [g.productId, invoiceDateById.get(g._max.invoiceId!) ?? null]),
  );

  const deadStock = products
    .filter((p) => !recentlySoldIds.has(p.id) && p.stockQty > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      categoryName: p.category?.name ?? 'Uncategorized',
      stockQty: p.stockQty,
      costPrice: Number(p.costPrice),
      capitalTiedUp: p.stockQty * Number(p.costPrice),
      lastSoldAt: lastSoldAtByProduct.get(p.id) ?? null,
    }))
    .sort((a, b) => b.capitalTiedUp - a.capitalTiedUp);

  res.json({ windowDays: days, count: deadStock.length, totalCapitalTiedUp: deadStock.reduce((s, p) => s + p.capitalTiedUp, 0), products: deadStock });
});

export default router;
