import { Router } from 'express';
import { requirePermission } from '@pospe/permissions';
import { prisma, ctxOf } from '../lib/prisma';
import { ddmmyyyy, ddmmyyyyHhmm, dayEnd, dayStart, monthName, num, rangeFor, round2, titleCaseMethod, weekdayName } from '../lib/util';

const router = Router();
const canViewReports = requirePermission('report:view');

const PALETTE = ['#FF8800', '#2E86DE', '#10AC84', '#EE5253', '#8E44AD', '#F1C40F', '#576574', '#01A3A4'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const q = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

router.get('/dashboard', canViewReports, async (req, res) => {
  const ctx = await ctxOf(req);
  const range = rangeFor(q(req.query.key), q(req.query.startDate), q(req.query.endDate));
  const invoices = await prisma.invoice.findMany({
    where: { storeId: ctx.storeId, status: 'PAID', createdAt: { gte: range.from, lte: range.to } },
    include: { items: { include: { product: { include: { category: true } } } } },
    orderBy: { createdAt: 'asc' },
  });

  const byMethod = new Map<string, number>();
  const byCategory = new Map<string, { sales: number; qty: number }>();
  const byProduct = new Map<string, { name: string; category: string; image: string; sold: number }>();
  const byMonth = new Map<string, number>();
  const byDay = new Map<string, number>(WEEKDAYS.map((d) => [d, 0]));

  for (const inv of invoices) {
    const total = num(inv.total);
    byMethod.set(inv.paymentMethod, (byMethod.get(inv.paymentMethod) ?? 0) + total);
    const month = monthName(inv.createdAt);
    byMonth.set(month, (byMonth.get(month) ?? 0) + total);
    const day = weekdayName(inv.createdAt);
    byDay.set(day, (byDay.get(day) ?? 0) + total);
    for (const item of inv.items) {
      const category = item.product.category?.name ?? 'Uncategorised';
      const c = byCategory.get(category) ?? { sales: 0, qty: 0 };
      c.sales += num(item.total);
      c.qty += item.quantity;
      byCategory.set(category, c);
      const p = byProduct.get(item.productId) ?? { name: item.product.name, category, image: item.product.imageUrl ?? '', sold: 0 };
      p.sold += item.quantity;
      byProduct.set(item.productId, p);
    }
  }

  res.json({
    data: {
      today_sales_by_payment_method: [...byMethod.entries()].map(([m, v]) => ({ payment_method: titleCaseMethod(m), total_sales: round2(v) })),
      category_wise_sales_stats: [...byCategory.entries()].map(([name, v]) => ({ category_name: name, total_sales: round2(v.sales) })),
      top_categories: [...byCategory.entries()]
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, PALETTE.length)
        .map(([name, v], i) => ({ name, count: v.qty, color: PALETTE[i] })),
      top_selling_products: [...byProduct.values()]
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 10)
        .map((p) => ({ name: p.name, category: p.category, image_url: p.image, sold: p.sold })),
      total_monthly_sales_stats: Object.fromEntries([...byMonth.entries()].map(([m, v]) => [m, round2(v)])),
      sales_by_day: Object.fromEntries([...byDay.entries()].map(([d, v]) => [d, round2(v)])),
    },
  });
});

router.get('/get-date-wise-total-payment', async (req, res) => {
  const ctx = await ctxOf(req);
  const start = q(req.query.start_date) ? dayStart(String(req.query.start_date)) : null;
  const end = q(req.query.end_date) ? dayStart(String(req.query.end_date)) : null;
  const from = start ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const invoices = await prisma.invoice.findMany({
    where: { storeId: ctx.storeId, status: 'PAID', createdAt: { gte: from, ...(end ? { lte: dayEnd(end) } : {}) } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, total: true, paymentMethod: true },
  });
  const days = new Map<string, { total: number; total_amount: number; payment_methods: Record<string, number> }>();
  for (const inv of invoices) {
    const key = ddmmyyyy(inv.createdAt);
    const d = days.get(key) ?? { total: 0, total_amount: 0, payment_methods: {} };
    const method = titleCaseMethod(inv.paymentMethod);
    d.total += 1;
    d.total_amount = round2(d.total_amount + num(inv.total));
    d.payment_methods[method] = round2((d.payment_methods[method] ?? 0) + num(inv.total));
    days.set(key, d);
  }
  res.json({ transactions: [...days.entries()].map(([order_date, d]) => ({ order_date, ...d })) });
});

router.get('/get-transaction-details', async (req, res) => {
  const ctx = await ctxOf(req);
  const day = q(req.query.date) ? dayStart(String(req.query.date)) : null;
  if (!day) return res.status(400).json({ status: false, message: 'A valid date (DD-MM-YYYY) is required' });
  const method = q(req.query.payment_method);
  const invoices = await prisma.invoice.findMany({
    where: {
      storeId: ctx.storeId,
      status: 'PAID',
      createdAt: { gte: day, lte: dayEnd(day) },
      ...(method && method !== 'All' ? { paymentMethod: method.toUpperCase() as 'CASH' | 'UPI' | 'CARD' } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    transactions: invoices.map((i) => ({
      order_id: i.id,
      bill_no: i.invoiceNumber ?? '',
      amount: num(i.total),
      mode: titleCaseMethod(i.paymentMethod),
      date_time: ddmmyyyyHhmm(i.createdAt),
    })),
  });
});

export default router;
