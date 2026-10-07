import type { PaymentMethod } from '@prisma/client';
import { round2 } from '@pospe/utilities';
import { prisma } from './prisma';

export interface AnalyticsFilters {
  from: Date;
  to: Date;
  storeId?: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
}

const TZ = 'Asia/Kolkata';
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const dayLabel = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, month: 'short', day: '2-digit' });
const hourOf = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false });

const PAYMENT_LABELS: Record<PaymentMethod, { label: string; color: string }> = {
  UPI: { label: 'UPI / QR', color: '#2563eb' },
  CARD: { label: 'Card', color: '#9333ea' },
  CASH: { label: 'Cash Tender', color: '#10b981' },
  SPLIT: { label: 'Split Tender', color: '#f59e0b' },
};

const TIER_LABELS: Record<string, string> = {
  VIP_DIAMOND: 'Platinum Enterprise',
  GOLD: 'VIP Gold',
  SILVER: 'Silver Star',
  STANDARD: 'Standard',
};

function hourLabel(h: number) {
  const suffix = h < 12 ? 'AM' : 'PM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${suffix}`;
}

function stockStatus(stockQty: number, minThreshold: number): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (stockQty <= 0) return 'out-of-stock';
  if (stockQty <= minThreshold) return 'low-stock';
  return 'in-stock';
}

/**
 * Every figure on the Reports & Analytics page, computed from the tenant's
 * real invoices, credit notes, customers and catalog for the given window.
 * Line values are net of the invoice-level discount (pro rata) and ex-GST;
 * revenue figures add GST back on.
 */
export async function computeAnalytics(tenantId: string, filters: AnalyticsFilters) {
  const { from, to, storeId, categoryId, paymentMethod } = filters;
  const stores = await prisma.store.findMany({ where: { tenantId }, select: { id: true, name: true } });
  const storeIds = storeId ? stores.filter((s) => s.id === storeId).map((s) => s.id) : stores.map((s) => s.id);
  const storeName = new Map(stores.map((s) => [s.id, s.name]));
  const windowMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - windowMs);

  const [invoices, creditNotes, newCustomers, prevNewCustomers, walletRedeemed, lowStock, categories] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        storeId: { in: storeIds },
        createdAt: { gte: from, lte: to },
        status: { in: ['PAID', 'PARTIALLY_PAID', 'REFUNDED'] },
        ...(paymentMethod ? { paymentMethod } : {}),
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, costPrice: true, stockQty: true, minThreshold: true, gstRate: true, categoryId: true, category: { select: { name: true } } },
            },
          },
        },
      },
    }),
    prisma.creditNote.findMany({
      where: { tenantId, status: 'ISSUED', storeId: { in: storeIds }, createdAt: { gte: from, lte: to } },
      include: { items: { include: { product: { select: { costPrice: true, categoryId: true } } } } },
    }),
    prisma.customer.count({ where: { tenantId, createdAt: { gte: from, lte: to } } }),
    prisma.customer.count({ where: { tenantId, createdAt: { gte: prevFrom, lt: from } } }),
    prisma.customerWalletTransaction.aggregate({
      where: { tenantId, type: 'REDEEM', createdAt: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.product.findMany({
      where: { tenantId, isBundle: false },
      select: { id: true, name: true, sku: true, stockQty: true, minThreshold: true, gstRate: true, category: { select: { name: true } } },
    }),
    prisma.category.findMany({ where: { tenantId }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  // Per-day buckets across the whole window (zero-filled).
  const series = new Map<string, { date: string; label: string; revenue: number; profit: number; orders: number }>();
  for (let t = from.getTime(); t <= to.getTime(); t += 86_400_000) {
    const d = new Date(t);
    const key = dayKey.format(d);
    if (!series.has(key)) series.set(key, { date: key, label: dayLabel.format(d), revenue: 0, profit: 0, orders: 0 });
  }

  const hourly = new Map<number, number>();
  const paymentTotals = new Map<PaymentMethod, number>();
  const categoryAgg = new Map<string, { categoryId: string; label: string; grossSales: number; grossProfit: number }>();
  const productAgg = new Map<string, { productId: string; name: string; sku: string; categoryName: string; unitsSold: number; revenue: number; profit: number; stockQty: number; minThreshold: number; gstRate: number }>();
  const slabs = new Map<number, number>();
  const cashierAgg = new Map<string, { invoicesHandled: number; revenue: number; voidCount: number; storeIds: Set<string> }>();

  let grossSales = 0;
  let discounts = 0;
  let returns = 0;
  let cogs = 0;
  let orders = 0;
  let revenueTotal = 0;

  for (const inv of invoices) {
    const subtotal = Number(inv.subtotal);
    const ratio = subtotal > 0 ? Number(inv.discountTotal) / subtotal : 0;
    const refunded = inv.status === 'REFUNDED';
    let invoiceRevenue = 0;
    let invoiceProfit = 0;
    let matchedLines = 0;

    for (const item of inv.items) {
      if (categoryId && item.product.categoryId !== categoryId) continue;
      matchedLines += 1;
      const gross = item.quantity * Number(item.price);
      const net = gross * (1 - ratio);
      const rate = Number(item.gstRate);
      const tax = net * (rate / 100);
      const cost = item.quantity * Number(item.product.costPrice);

      grossSales += gross;
      discounts += gross - net;
      if (refunded) {
        returns += net;
        continue; // a refunded sale contributes no revenue, cost or tax
      }
      cogs += cost;
      slabs.set(rate, (slabs.get(rate) ?? 0) + net);
      invoiceRevenue += net + tax;
      invoiceProfit += net - cost;

      const catId = item.product.categoryId ?? 'uncategorized';
      const cat = categoryAgg.get(catId) ?? { categoryId: catId, label: item.product.category?.name ?? 'Uncategorized', grossSales: 0, grossProfit: 0 };
      cat.grossSales += net;
      cat.grossProfit += net - cost;
      categoryAgg.set(catId, cat);

      const p = productAgg.get(item.productId) ?? {
        productId: item.productId,
        name: item.product.name,
        sku: item.product.sku,
        categoryName: item.product.category?.name ?? 'Uncategorized',
        unitsSold: 0,
        revenue: 0,
        profit: 0,
        stockQty: item.product.stockQty,
        minThreshold: item.product.minThreshold,
        gstRate: rate,
      };
      p.unitsSold += item.quantity;
      p.revenue += net + tax;
      p.profit += net - cost;
      productAgg.set(item.productId, p);
    }
    if (matchedLines === 0) continue;

    if (inv.createdById) {
      const c = cashierAgg.get(inv.createdById) ?? { invoicesHandled: 0, revenue: 0, voidCount: 0, storeIds: new Set<string>() };
      c.storeIds.add(inv.storeId);
      if (refunded) c.voidCount += 1;
      else {
        c.invoicesHandled += 1;
        c.revenue += invoiceRevenue;
      }
      cashierAgg.set(inv.createdById, c);
    }
    if (refunded) continue;

    orders += 1;
    revenueTotal += invoiceRevenue;
    paymentTotals.set(inv.paymentMethod, (paymentTotals.get(inv.paymentMethod) ?? 0) + invoiceRevenue);
    const hour = Number(hourOf.format(inv.createdAt)) % 24;
    hourly.set(hour, (hourly.get(hour) ?? 0) + 1);
    const day = series.get(dayKey.format(inv.createdAt));
    if (day) {
      day.revenue += invoiceRevenue;
      day.profit += invoiceProfit;
      day.orders += 1;
    }
  }

  // Partial returns: credit notes reduce revenue, cost (restocked) and tax.
  for (const note of creditNotes) {
    for (const item of note.items) {
      if (categoryId && item.product.categoryId !== categoryId) continue;
      const rate = Number(item.gstRate);
      const net = Number(item.total) / (1 + rate / 100);
      returns += net;
      cogs -= item.quantity * Number(item.product.costPrice);
      slabs.set(rate, (slabs.get(rate) ?? 0) - net);
    }
  }

  const netOperatingRevenue = grossSales - discounts - returns;
  const grossProfit = netOperatingRevenue - cogs;

  const hours = [...hourly.keys()];
  const firstHour = Math.min(8, ...hours);
  const lastHour = Math.max(21, ...hours);
  const hourlyFootfall = [];
  for (let h = firstHour; h <= lastHour; h += 1) hourlyFootfall.push({ hour: hourLabel(h), invoices: hourly.get(h) ?? 0 });

  const paymentMethodSplit = (Object.keys(PAYMENT_LABELS) as PaymentMethod[])
    .map((m) => ({ method: PAYMENT_LABELS[m].label, color: PAYMENT_LABELS[m].color, amount: round2(paymentTotals.get(m) ?? 0) }))
    .filter((p) => p.amount > 0)
    .map((p) => ({ ...p, percent: revenueTotal > 0 ? Math.round((p.amount / revenueTotal) * 1000) / 10 : 0 }));

  const topProducts = [...productAgg.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 50)
    .map((p) => ({
      ...p,
      revenue: round2(p.revenue),
      profit: round2(p.profit),
      marginPercent: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 1000) / 10 : 0,
      status: stockStatus(p.stockQty, p.minThreshold),
    }));

  const reorderAlerts = lowStock
    .filter((p) => p.stockQty <= p.minThreshold)
    .sort((a, b) => a.stockQty - b.stockQty)
    .slice(0, 10)
    .map((p) => ({ productId: p.id, name: p.name, sku: p.sku, stockQty: p.stockQty, minThreshold: p.minThreshold, categoryName: p.category?.name ?? 'Uncategorized', gstRate: Number(p.gstRate) }));

  // Lifetime (all-time) spend for the VIP table and average lifetime value.
  const lifetime = await prisma.invoice.groupBy({
    by: ['customerId'],
    where: { customerId: { not: null }, status: { in: ['PAID', 'PARTIALLY_PAID'] }, store: { tenantId } },
    _sum: { total: true },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  const ranked = lifetime
    .map((r) => ({ customerId: r.customerId!, spend: Number(r._sum.total ?? 0), visits: r._count._all, last: r._max.createdAt }))
    .sort((a, b) => b.spend - a.spend);
  const vipIds = ranked.slice(0, 8).map((r) => r.customerId);
  const vipRows = await prisma.customer.findMany({ where: { id: { in: vipIds } }, select: { id: true, name: true, phone: true, email: true, tier: true } });
  const vipById = new Map(vipRows.map((c) => [c.id, c]));
  const vipCustomers = ranked.slice(0, 8).map((r) => {
    const c = vipById.get(r.customerId);
    return {
      name: c?.name ?? 'Customer',
      contact: c?.phone ?? c?.email ?? '—',
      tier: TIER_LABELS[c?.tier ?? 'STANDARD'],
      visits: r.visits,
      lifetimeSpend: round2(r.spend),
      avgBasket: r.visits ? round2(r.spend / r.visits) : 0,
      lastPurchase: r.last ? dayKey.format(r.last) : '',
    };
  });

  const cashierIds = [...cashierAgg.keys()];
  const cashiers = await prisma.user.findMany({ where: { id: { in: cashierIds }, tenantId }, select: { id: true, name: true } });
  const cashierName = new Map(cashiers.map((u) => [u.id, u.name]));
  const cashierLeaderboard = [...cashierAgg.entries()]
    .map(([id, c]) => ({
      name: cashierName.get(id) ?? 'Former staff',
      terminal: [...c.storeIds].map((s) => storeName.get(s) ?? 'Store').join(', '),
      invoicesHandled: c.invoicesHandled,
      revenue: round2(c.revenue),
      avgBasket: c.invoicesHandled ? round2(c.revenue / c.invoicesHandled) : 0,
      voidCount: c.voidCount,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const gstTaxSlabSummary = [...slabs.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ratePercent, taxable]) => {
      const taxableAmount = round2(Math.max(0, taxable));
      const cgst = round2((taxableAmount * ratePercent) / 2 / 100);
      return { ratePercent, slabLabel: ratePercent === 0 ? '0% Exempt' : `${ratePercent}% GST`, taxableAmount, cgst, sgst: cgst, total: round2(cgst * 2) };
    });
  const gstTotal = round2(gstTaxSlabSummary.reduce((s, g) => s + g.total, 0));

  const pnlStatement = {
    grossSales: round2(grossSales),
    discounts: round2(discounts),
    returns: round2(returns),
    netOperatingRevenue: round2(netOperatingRevenue),
    cogs: round2(cogs),
    grossProfit: round2(grossProfit),
    // Operating expenses (rent, payroll…) aren't recorded anywhere yet.
    overheadLines: [] as { label: string; amount: number }[],
    totalOverhead: 0,
    finalNetOperatingProfit: round2(grossProfit),
  };

  const kpi = {
    grossSales: round2(revenueTotal),
    netProfit: pnlStatement.finalNetOperatingProfit,
    gst: gstTotal,
    orders,
    returns: pnlStatement.returns,
    aov: orders ? round2(revenueTotal / orders) : 0,
    marginPct: netOperatingRevenue > 0 ? Math.round((grossProfit / netOperatingRevenue) * 1000) / 10 : 0,
    returnsRate: grossSales > 0 ? Math.round((returns / grossSales) * 1000) / 10 : 0,
    cgst: round2(gstTotal / 2),
    sgst: round2(gstTotal / 2),
  };

  const avgLifetimeValue = ranked.length ? round2(ranked.reduce((s, r) => s + r.spend, 0) / ranked.length) : 0;

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    kpi,
    revenueSeries: [...series.values()].map((d) => ({ ...d, revenue: round2(d.revenue), profit: round2(d.profit) })),
    paymentMethodSplit,
    hourlyFootfall,
    categoryMargin: [...categoryAgg.values()].map((c) => ({ ...c, grossSales: round2(c.grossSales), grossProfit: round2(c.grossProfit) })),
    topProducts,
    reorderAlerts,
    crmStats: {
      newCustomers,
      newCustomersGrowthPct: prevNewCustomers ? Math.round(((newCustomers - prevNewCustomers) / prevNewCustomers) * 1000) / 10 : newCustomers > 0 ? 100 : 0,
      avgLifetimeValue,
      walletCreditRedeemed: round2(Math.abs(Number(walletRedeemed._sum.amount ?? 0))),
    },
    vipCustomers,
    cashierLeaderboard,
    pnlStatement,
    gstTaxSlabSummary,
    gstTotal,
    options: {
      branches: stores.map((s) => ({ value: s.id, label: s.name })),
      categories: categories.map((c) => ({ value: c.id, label: c.name })),
    },
  };
}

export type AnalyticsReport = Awaited<ReturnType<typeof computeAnalytics>>;
