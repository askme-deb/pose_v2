import { Router } from 'express';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

type Timeframe = 'today' | '7d' | '30d' | '90d';
const WINDOW_DAYS: Record<Timeframe, number> = { today: 1, '7d': 7, '30d': 30, '90d': 90 };
const REVENUE_STATUSES = ['PAID', 'PARTIALLY_PAID'] as const;

function windowStart(timeframe: Timeframe, from: Date): Date {
  const start = new Date(from);
  if (timeframe === 'today') {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - WINDOW_DAYS[timeframe]);
  }
  return start;
}

function pctDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

router.get('/dashboard', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const timeframe = ((req.query.timeframe as string) || 'today') as Timeframe;
  if (!WINDOW_DAYS[timeframe]) return res.status(400).json({ error: 'Invalid timeframe' });

  const stores = await prisma.store.findMany({ where: { tenantId }, select: { id: true, name: true } });
  const storeIds = stores.map((s) => s.id);
  const storeNameById = new Map(stores.map((s) => [s.id, s.name]));

  const now = new Date();
  const currentStart = windowStart(timeframe, now);
  const windowMs = now.getTime() - currentStart.getTime();
  const previousStart = new Date(currentStart.getTime() - windowMs);

  const [currentInvoices, previousInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: { storeId: { in: storeIds }, createdAt: { gte: currentStart, lte: now } },
      include: { items: { include: { product: { select: { id: true, name: true, sku: true, imageUrl: true, costPrice: true, category: { select: { name: true } } } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.findMany({
      where: { storeId: { in: storeIds }, createdAt: { gte: previousStart, lt: currentStart }, status: { in: [...REVENUE_STATUSES] } },
      select: { total: true },
    }),
  ]);

  const revenueInvoices = currentInvoices.filter((inv) => (REVENUE_STATUSES as readonly string[]).includes(inv.status));

  const revenue = revenueInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const orders = revenueInvoices.length;
  const profit = revenueInvoices.reduce(
    (sum, inv) => sum + inv.items.reduce((s, i) => s + i.quantity * (Number(i.price) - Number(i.product.costPrice)), 0),
    0,
  );
  const avgTicket = orders ? revenue / orders : 0;
  const marginPct = revenue ? Math.round((profit / revenue) * 1000) / 10 : 0;

  const prevRevenue = previousInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const prevOrders = previousInvoices.length;
  const prevAvgTicket = prevOrders ? prevRevenue / prevOrders : 0;

  // Trend: hourly buckets for "today", daily buckets otherwise.
  const trendMap = new Map<string, { revenue: number; profit: number }>();
  const trendLabels: string[] = [];
  if (timeframe === 'today') {
    for (let h = 9; h <= 21; h++) {
      const label = `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? 'PM' : 'AM'}`;
      trendLabels.push(label);
      trendMap.set(label, { revenue: 0, profit: 0 });
    }
    revenueInvoices.forEach((inv) => {
      const h = inv.createdAt.getHours();
      const label = `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? 'PM' : 'AM'}`;
      const bucket = trendMap.get(label);
      if (bucket) {
        bucket.revenue += Number(inv.total);
        bucket.profit += inv.items.reduce((s, i) => s + i.quantity * (Number(i.price) - Number(i.product.costPrice)), 0);
      }
    });
  } else {
    const days = WINDOW_DAYS[timeframe];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      trendLabels.push(label);
      trendMap.set(label, { revenue: 0, profit: 0 });
    }
    revenueInvoices.forEach((inv) => {
      const label = inv.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const bucket = trendMap.get(label);
      if (bucket) {
        bucket.revenue += Number(inv.total);
        bucket.profit += inv.items.reduce((s, i) => s + i.quantity * (Number(i.price) - Number(i.product.costPrice)), 0);
      }
    });
  }
  const trend = trendLabels.map((label) => ({ label, ...trendMap.get(label)! }));

  // Payment method split
  const paymentTotals = new Map<string, number>();
  revenueInvoices.forEach((inv) => {
    paymentTotals.set(inv.paymentMethod, (paymentTotals.get(inv.paymentMethod) ?? 0) + Number(inv.total));
  });
  const paymentSplit = Array.from(paymentTotals.entries())
    .map(([method, amount]) => ({ method, pct: revenue ? Math.round((amount / revenue) * 1000) / 10 : 0 }))
    .sort((a, b) => b.pct - a.pct);

  // Category performance
  const categoryTotals = new Map<string, number>();
  revenueInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const catName = item.product.category?.name ?? 'Uncategorized';
      categoryTotals.set(catName, (categoryTotals.get(catName) ?? 0) + Number(item.total));
    });
  });
  const categoryPerformance = Array.from(categoryTotals.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Branch performance
  const branchTotals = new Map<string, number>();
  revenueInvoices.forEach((inv) => {
    const name = storeNameById.get(inv.storeId) ?? 'Unknown';
    branchTotals.set(name, (branchTotals.get(name) ?? 0) + Number(inv.total));
  });
  const branchPerformance = Array.from(branchTotals.entries()).map(([name, amount]) => ({ name, amount }));

  // Top SKUs
  const skuTotals = new Map<string, { id: string; name: string; sku: string; imageUrl: string; unitsSold: number; revenue: number }>();
  revenueInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const key = item.product.id;
      const existing = skuTotals.get(key) ?? { id: item.product.id, name: item.product.name, sku: item.product.sku, imageUrl: item.product.imageUrl ?? '', unitsSold: 0, revenue: 0 };
      existing.unitsSold += item.quantity;
      existing.revenue += Number(item.total);
      skuTotals.set(key, existing);
    });
  });
  const topSkus = Array.from(skuTotals.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Recent transactions (most recent 15 regardless of status, matches a live bill stream)
  const transactions = currentInvoices.slice(0, 15).map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    branch: storeNameById.get(inv.storeId) ?? 'Unknown',
    paymentMethod: inv.paymentMethod,
    amount: Number(inv.total),
    createdAt: inv.createdAt,
  }));

  // Stock alerts — real-time snapshot, independent of the reporting timeframe
  const products = await prisma.product.findMany({ where: { tenantId }, select: { id: true, name: true, stockQty: true, minThreshold: true } });
  const stockAlerts = products
    .filter((p) => p.minThreshold > 0 && p.stockQty <= p.minThreshold)
    .map((p) => ({
      id: p.id,
      name: p.name,
      stockQty: p.stockQty,
      minThreshold: p.minThreshold,
      severity: (p.stockQty === 0 || p.stockQty <= p.minThreshold * 0.3 ? 'critical' : 'low') as 'critical' | 'low',
    }))
    .sort((a, b) => a.stockQty - b.stockQty);

  res.json({
    kpis: {
      revenue,
      revenueDeltaPct: pctDelta(revenue, prevRevenue),
      orders,
      ordersDeltaPct: pctDelta(orders, prevOrders),
      profit,
      marginPct,
      avgTicket,
      avgTicketDeltaPct: pctDelta(avgTicket, prevAvgTicket),
      lowStockSkus: stockAlerts.length,
      criticalReorders: stockAlerts.filter((a) => a.severity === 'critical').length,
    },
    trend,
    paymentSplit,
    categoryPerformance,
    branchPerformance,
    topSkus,
    transactions,
    stockAlerts,
  });
});

export default router;
