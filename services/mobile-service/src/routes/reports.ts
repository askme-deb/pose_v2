import { Router } from 'express';
import crypto from 'node:crypto';
import { requirePermission, HttpError } from '@pospe/permissions';
import { prisma, ctxOf } from '../lib/prisma';
import { ddmmyyyyHhmm, num, rangeFor, round2, titleCaseMethod, ymd } from '../lib/util';

export const publicRouter = Router();
const router = Router();

const REPORTS = [
  { id: 1, name: 'Sales Report' },
  { id: 2, name: 'Payment Mode Report' },
  { id: 3, name: 'Product Sales Report' },
  { id: 4, name: 'Stock Report' },
];
const FILTERS = new Set(['today', 'yesterday', '15days', 'monthly', 'quarterly', 'custom']);
const FILTER_TO_KEY: Record<string, string> = { today: 'TD', yesterday: 'YD', '15days': '15D', monthly: '1M', quarterly: '3M', custom: 'Custom' };
const LINK_TTL_MS = 15 * 60 * 1000;

interface LinkPayload {
  t: string; // tenant
  s: string; // store
  r: number; // report id
  f: string; // filter
  a?: string; // custom start
  b?: string; // custom end
  e: number; // expiry (ms)
}

// The app downloads the link with a bare GET and no Authorization header
// (contract §9.2), so the link carries its own proof: an HMAC over the
// scope + expiry, signed with the shared server secret.
const sign = (body: string) => crypto.createHmac('sha256', process.env.JWT_SECRET ?? '').update(body).digest('base64url');
function makeToken(p: LinkPayload) {
  const body = Buffer.from(JSON.stringify(p)).toString('base64url');
  return `${body}.${sign(body)}`;
}
function readToken(token: string): LinkPayload | null {
  const [body, mac] = token.split('.');
  if (!body || !mac || !process.env.JWT_SECRET) return null;
  const expected = sign(body);
  if (expected.length !== mac.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(mac))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as LinkPayload;
    return p.e > Date.now() ? p : null;
  } catch {
    return null;
  }
}

router.get('/get-report-list', requirePermission('report:view'), (_req, res) => {
  res.json({ data: { reports_list: REPORTS } });
});

router.get('/get-report-excel-link', requirePermission('report:view'), async (req, res) => {
  const ctx = await ctxOf(req);
  const id = Number(req.query.id);
  const filter = typeof req.query.filter === 'string' ? req.query.filter : 'today';
  if (!REPORTS.some((r) => r.id === id)) throw new HttpError(400, 'Unknown report');
  if (!FILTERS.has(filter) && !(req.query.start_date && req.query.end_date)) throw new HttpError(400, 'Unknown date filter');
  const custom = typeof req.query.start_date === 'string' && typeof req.query.end_date === 'string';
  const token = makeToken({
    t: ctx.tenantId,
    s: ctx.storeId,
    r: id,
    f: custom ? 'custom' : filter,
    ...(custom ? { a: String(req.query.start_date), b: String(req.query.end_date) } : {}),
    e: Date.now() + LINK_TTL_MS,
  });
  const base = (process.env.PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
  res.json({ data: { excel_link: `${base}/report-download/${token}` } });
});

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  // Leading = + - @ would be run as a formula by Excel; defuse it.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const toCsv = (rows: unknown[][]) => `﻿${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;

publicRouter.get('/report-download/:token', async (req, res) => {
  const p = readToken(req.params.token);
  if (!p) return res.status(403).json({ status: false, message: 'This download link is invalid or has expired' });
  const range = rangeFor(FILTER_TO_KEY[p.f] ?? 'TD', p.a, p.b);
  const store = await prisma.store.findFirst({ where: { id: p.s, tenantId: p.t }, select: { id: true, name: true } });
  if (!store) return res.status(404).json({ status: false, message: 'Branch not found' });

  let rows: unknown[][];
  if (p.r === 4) {
    const products = await prisma.product.findMany({ where: { tenantId: p.t }, orderBy: { name: 'asc' } });
    rows = [['Product', 'SKU', 'Stock', 'Minimum', 'Price', 'Stock value'], ...products.map((x) => [x.name, x.sku, x.stockQty, x.minThreshold, num(x.price), round2(num(x.costPrice) * x.stockQty)])];
  } else {
    const invoices = await prisma.invoice.findMany({
      where: { storeId: p.s, status: 'PAID', createdAt: { gte: range.from, lte: range.to } },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    });
    if (p.r === 1) {
      rows = [
        ['Bill no', 'Date', 'Payment', 'Seat', 'Phone', 'Subtotal', 'Discount', 'Tax', 'Total'],
        ...invoices.map((i) => [i.invoiceNumber, ddmmyyyyHhmm(i.createdAt), titleCaseMethod(i.paymentMethod), i.seatNo, i.customerPhone, num(i.subtotal), num(i.discountTotal), num(i.taxTotal), num(i.total)]),
      ];
    } else if (p.r === 2) {
      const m = new Map<string, { n: number; amount: number }>();
      for (const i of invoices) {
        const e = m.get(i.paymentMethod) ?? { n: 0, amount: 0 };
        e.n += 1;
        e.amount += num(i.total);
        m.set(i.paymentMethod, e);
      }
      rows = [['Payment mode', 'Bills', 'Amount'], ...[...m.entries()].map(([k, v]) => [titleCaseMethod(k), v.n, round2(v.amount)])];
    } else {
      const m = new Map<string, { name: string; qty: number; amount: number }>();
      for (const i of invoices) {
        for (const it of i.items) {
          const e = m.get(it.productId) ?? { name: it.product.name, qty: 0, amount: 0 };
          e.qty += it.quantity;
          e.amount += num(it.total);
          m.set(it.productId, e);
        }
      }
      rows = [['Product', 'Quantity sold', 'Amount'], ...[...m.values()].sort((a, b) => b.amount - a.amount).map((v) => [v.name, v.qty, round2(v.amount)])];
    }
  }

  const name = `${REPORTS.find((r) => r.id === p.r)?.name.replace(/\s+/g, '-')}-${ymd(range.from)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.send(toCsv(rows));
});

export default router;
