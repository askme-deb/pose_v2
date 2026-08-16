import { categories } from './categories';
import { products, stockStatus } from './products';

export type DashboardTimeframe = 'today' | '7d' | '30d' | '90d';

export const dashboardTimeframeOptions: { value: DashboardTimeframe; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

// ---------------------------------------------------------------------------
// Deterministic daily revenue/profit/orders series for the trailing 90 days
// ending "today" (2026-08-16), used to derive both the KPI totals and the
// trend chart so the numbers stay internally consistent across timeframes.
// ---------------------------------------------------------------------------

const TODAY = new Date('2026-08-16T00:00:00');
const DAYS = 90;
const BASE_REVENUE = 122000;
// Sun..Sat multipliers - weekends run hotter for a supermarket chain.
const WEEKDAY_MULTIPLIER = [1.16, 0.87, 0.9, 0.94, 0.97, 1.05, 1.24];

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(84621);
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

interface DailyPoint {
  date: string;
  label: string;
  revenue: number;
  profit: number;
  orders: number;
  avgTicket: number;
}

const dailySeries: DailyPoint[] = [];
for (let i = DAYS - 1; i >= 0; i--) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - i);
  const dayIndex = DAYS - 1 - i;
  const growth = 1 + dayIndex * 0.0021;
  const weekdayMult = WEEKDAY_MULTIPLIER[d.getDay()];
  const noise = 0.9 + rand() * 0.2;
  const revenue = Math.round(BASE_REVENUE * growth * weekdayMult * noise);
  const marginPct = 26 + rand() * 4;
  const profit = Math.round(revenue * (marginPct / 100));
  const avgTicket = round2(348 + rand() * 30);
  const orders = Math.round(revenue / avgTicket);
  dailySeries.push({
    date: d.toISOString().slice(0, 10),
    label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    revenue,
    profit,
    orders,
    avgTicket,
  });
}

const today = dailySeries[DAYS - 1];

function sumRange(days: number) {
  const slice = dailySeries.slice(DAYS - days);
  return slice.reduce(
    (acc, d) => ({ revenue: acc.revenue + d.revenue, profit: acc.profit + d.profit, orders: acc.orders + d.orders }),
    { revenue: 0, profit: 0, orders: 0 },
  );
}

const agg7 = sumRange(7);
const agg30 = sumRange(30);
const agg90 = sumRange(90);

// ---------------------------------------------------------------------------
// KPI cards
// ---------------------------------------------------------------------------

export interface DashboardKpis {
  revenue: number;
  revenueDelta: string;
  revenueDeltaSub: string;
  orders: number;
  ordersSuffix: string;
  ordersDelta: string;
  ordersDeltaSub: string;
  profit: number;
  marginPct: number;
  marginSub: string;
  avgTicket: number;
  avgTicketDelta: string;
  avgTicketDeltaSub: string;
  lowStockSkus: number;
  criticalReorders: number;
  registersActive: number;
  registersTotal: number;
  uptimePct: number;
}

export const dashboardKpisByTimeframe: Record<DashboardTimeframe, DashboardKpis> = {
  today: {
    revenue: today.revenue,
    revenueDelta: '+18.4%',
    revenueDeltaSub: 'vs yesterday',
    orders: today.orders,
    ordersSuffix: 'Bills',
    ordersDelta: '+12 orders/hr',
    ordersDeltaSub: 'peak load',
    profit: today.profit,
    marginPct: round1((today.profit / today.revenue) * 100),
    marginSub: 'target met',
    avgTicket: today.avgTicket,
    avgTicketDelta: '+4.2%',
    avgTicketDeltaSub: 'basket value',
    lowStockSkus: 14,
    criticalReorders: 3,
    registersActive: 6,
    registersTotal: 6,
    uptimePct: 100,
  },
  '7d': {
    revenue: agg7.revenue,
    revenueDelta: '+9.2%',
    revenueDeltaSub: 'vs prior 7 days',
    orders: agg7.orders,
    ordersSuffix: 'Bills',
    ordersDelta: `+${Math.round(agg7.orders / 7)} orders/day`,
    ordersDeltaSub: 'weekly average',
    profit: agg7.profit,
    marginPct: round1((agg7.profit / agg7.revenue) * 100),
    marginSub: 'on target',
    avgTicket: round2(agg7.revenue / agg7.orders),
    avgTicketDelta: '+2.6%',
    avgTicketDeltaSub: 'basket value',
    lowStockSkus: 18,
    criticalReorders: 5,
    registersActive: 6,
    registersTotal: 6,
    uptimePct: 100,
  },
  '30d': {
    revenue: agg30.revenue,
    revenueDelta: '+6.1%',
    revenueDeltaSub: 'vs prior 30 days',
    orders: agg30.orders,
    ordersSuffix: 'Bills',
    ordersDelta: `+${Math.round(agg30.orders / 30)} orders/day`,
    ordersDeltaSub: 'monthly average',
    profit: agg30.profit,
    marginPct: round1((agg30.profit / agg30.revenue) * 100),
    marginSub: 'steady',
    avgTicket: round2(agg30.revenue / agg30.orders),
    avgTicketDelta: '+1.8%',
    avgTicketDeltaSub: 'basket value',
    lowStockSkus: 21,
    criticalReorders: 6,
    registersActive: 6,
    registersTotal: 6,
    uptimePct: 100,
  },
  '90d': {
    revenue: agg90.revenue,
    revenueDelta: '+4.8%',
    revenueDeltaSub: 'vs prior 90 days',
    orders: agg90.orders,
    ordersSuffix: 'Bills',
    ordersDelta: `+${Math.round(agg90.orders / 90)} orders/day`,
    ordersDeltaSub: 'quarterly average',
    profit: agg90.profit,
    marginPct: round1((agg90.profit / agg90.revenue) * 100),
    marginSub: 'trending up',
    avgTicket: round2(agg90.revenue / agg90.orders),
    avgTicketDelta: '+1.1%',
    avgTicketDeltaSub: 'basket value',
    lowStockSkus: 24,
    criticalReorders: 8,
    registersActive: 6,
    registersTotal: 6,
    uptimePct: 100,
  },
};

// ---------------------------------------------------------------------------
// Revenue & profit trend chart
// ---------------------------------------------------------------------------

export interface TrendPoint {
  label: string;
  revenue: number;
  profit: number;
}

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const HOUR_WEIGHTS = [3.2, 4.8, 6.5, 9.8, 11.2, 8.5, 7.2, 9.0, 11.8, 14.5, 16.8, 9.5, 5.2];
const HOUR_WEIGHT_SUM = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const hr12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hr12}${period}`;
}

function hourlyTrend(): TrendPoint[] {
  return HOURS.map((h, i) => {
    const share = HOUR_WEIGHTS[i] / HOUR_WEIGHT_SUM;
    return {
      label: formatHourLabel(h),
      revenue: Math.round(today.revenue * share),
      profit: Math.round(today.profit * share),
    };
  });
}

export const revenueTrendByTimeframe: Record<DashboardTimeframe, TrendPoint[]> = {
  today: hourlyTrend(),
  '7d': dailySeries.slice(DAYS - 7).map((d) => ({ label: d.label, revenue: d.revenue, profit: d.profit })),
  '30d': dailySeries.slice(DAYS - 30).map((d) => ({ label: d.label, revenue: d.revenue, profit: d.profit })),
  '90d': dailySeries.map((d) => ({ label: d.label, revenue: d.revenue, profit: d.profit })),
};

// ---------------------------------------------------------------------------
// Payment method split donut
// ---------------------------------------------------------------------------

export type PaymentColor = 'blue' | 'purple' | 'emerald' | 'amber';

export interface PaymentSplitSlice {
  method: string;
  pct: number;
  color: PaymentColor;
}

export const paymentSplitByTimeframe: Record<DashboardTimeframe, PaymentSplitSlice[]> = {
  today: [
    { method: 'UPI / QR', pct: 48, color: 'blue' },
    { method: 'Cards', pct: 28, color: 'purple' },
    { method: 'Cash', pct: 16, color: 'emerald' },
    { method: 'BNPL', pct: 8, color: 'amber' },
  ],
  '7d': [
    { method: 'UPI / QR', pct: 46, color: 'blue' },
    { method: 'Cards', pct: 29, color: 'purple' },
    { method: 'Cash', pct: 17, color: 'emerald' },
    { method: 'BNPL', pct: 8, color: 'amber' },
  ],
  '30d': [
    { method: 'UPI / QR', pct: 45, color: 'blue' },
    { method: 'Cards', pct: 30, color: 'purple' },
    { method: 'Cash', pct: 17, color: 'emerald' },
    { method: 'BNPL', pct: 8, color: 'amber' },
  ],
  '90d': [
    { method: 'UPI / QR', pct: 44, color: 'blue' },
    { method: 'Cards', pct: 31, color: 'purple' },
    { method: 'Cash', pct: 17, color: 'emerald' },
    { method: 'BNPL', pct: 8, color: 'amber' },
  ],
};

// ---------------------------------------------------------------------------
// Category performance & branch performance (analytics row)
// ---------------------------------------------------------------------------

const CATEGORY_SHARE_PCT: Record<string, number> = {
  'cat-beverages': 24,
  'cat-confectionery': 20,
  'cat-dairy': 18,
  'cat-gourmet': 15,
  'cat-bakery': 13,
  'cat-fresh': 10,
};

export interface CategoryPerfPoint {
  name: string;
  amount: number;
}

export function categoryPerformance(timeframe: DashboardTimeframe): CategoryPerfPoint[] {
  const { revenue } = dashboardKpisByTimeframe[timeframe];
  return categories
    .map((c) => ({ name: c.name, amount: Math.round((revenue * (CATEGORY_SHARE_PCT[c.id] ?? 0)) / 100) }))
    .sort((a, b) => b.amount - a.amount);
}

export const branchNames = ['Downtown Flagship', 'Suburban Outlet', 'Airport Express'] as const;

const BRANCH_SHARE_PCT: Record<string, number> = {
  'Downtown Flagship': 46,
  'Suburban Outlet': 33,
  'Airport Express': 21,
};

export interface BranchPerfPoint {
  name: string;
  amount: number;
}

export function branchPerformance(timeframe: DashboardTimeframe): BranchPerfPoint[] {
  const { revenue } = dashboardKpisByTimeframe[timeframe];
  return branchNames.map((b) => ({ name: b, amount: Math.round((revenue * BRANCH_SHARE_PCT[b]) / 100) }));
}

// ---------------------------------------------------------------------------
// Hourly footfall (intraday pattern, independent of the reporting timeframe)
// ---------------------------------------------------------------------------

export interface FootfallPoint {
  label: string;
  visitors: number;
}

export const hourlyFootfall: FootfallPoint[] = [
  { label: '9AM', visitors: 42 },
  { label: '10AM', visitors: 58 },
  { label: '11AM', visitors: 76 },
  { label: '12PM', visitors: 112 },
  { label: '1PM', visitors: 128 },
  { label: '2PM', visitors: 96 },
  { label: '3PM', visitors: 82 },
  { label: '4PM', visitors: 104 },
  { label: '5PM', visitors: 135 },
  { label: '6PM', visitors: 162 },
  { label: '7PM', visitors: 188 },
  { label: '8PM', visitors: 134 },
  { label: '9PM', visitors: 65 },
];

// ---------------------------------------------------------------------------
// Live sales transactions feed
// ---------------------------------------------------------------------------

export interface Transaction {
  id: string;
  invoiceNo: string;
  customer: string;
  branch: string;
  paymentMethod: string;
  paymentColor: PaymentColor;
  amount: number;
  minutesAgo: number;
}

export const transactions: Transaction[] = [
  { id: 'txn-01', invoiceNo: '#INV-9821', customer: 'Sarah Jenkins', branch: 'Downtown Flagship', paymentMethod: 'UPI / QR', paymentColor: 'blue', amount: 1428, minutesAgo: 2 },
  { id: 'txn-02', invoiceNo: '#INV-9820', customer: 'Rahul Sharma', branch: 'Suburban Outlet', paymentMethod: 'Card', paymentColor: 'purple', amount: 3850, minutesAgo: 8 },
  { id: 'txn-03', invoiceNo: '#INV-9819', customer: 'Priya Patel', branch: 'Downtown Flagship', paymentMethod: 'Cash', paymentColor: 'emerald', amount: 650, minutesAgo: 14 },
  { id: 'txn-04', invoiceNo: '#INV-9818', customer: 'Vikram Singh', branch: 'Airport Express', paymentMethod: 'UPI / QR', paymentColor: 'blue', amount: 890, minutesAgo: 22 },
  { id: 'txn-05', invoiceNo: '#INV-9817', customer: 'Ananya Verma', branch: 'Suburban Outlet', paymentMethod: 'BNPL', paymentColor: 'amber', amount: 2140, minutesAgo: 35 },
  { id: 'txn-06', invoiceNo: '#INV-9816', customer: 'Arjun Nair', branch: 'Downtown Flagship', paymentMethod: 'Card', paymentColor: 'purple', amount: 5220, minutesAgo: 41 },
  { id: 'txn-07', invoiceNo: '#INV-9815', customer: 'Neha Kapoor', branch: 'Airport Express', paymentMethod: 'UPI / QR', paymentColor: 'blue', amount: 1180, minutesAgo: 47 },
  { id: 'txn-08', invoiceNo: '#INV-9814', customer: 'Karan Mehta', branch: 'Suburban Outlet', paymentMethod: 'Cash', paymentColor: 'emerald', amount: 475, minutesAgo: 53 },
  { id: 'txn-09', invoiceNo: '#INV-9813', customer: 'Divya Reddy', branch: 'Downtown Flagship', paymentMethod: 'UPI / QR', paymentColor: 'blue', amount: 2660, minutesAgo: 58 },
  { id: 'txn-10', invoiceNo: '#INV-9812', customer: 'Rohan Das', branch: 'Airport Express', paymentMethod: 'Card', paymentColor: 'purple', amount: 960, minutesAgo: 64 },
];

export function minutesAgoLabel(mins: number): string {
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
}

// ---------------------------------------------------------------------------
// Top selling SKUs (cross-referenced against services/mockData/products.ts)
// ---------------------------------------------------------------------------

export interface TopSkuEntry {
  productId: string;
  unitsSold: number;
}

export const topSkuSales: TopSkuEntry[] = [
  { productId: 'prd-011', unitsSold: 178 },
  { productId: 'prd-003', unitsSold: 356 },
  { productId: 'prd-001', unitsSold: 428 },
  { productId: 'prd-006', unitsSold: 512 },
  { productId: 'prd-007', unitsSold: 289 },
];

export interface TopSkuRow {
  id: string;
  name: string;
  sku: string;
  imageUrl: string;
  unitsSold: number;
  revenue: number;
}

export const topSkus: TopSkuRow[] = topSkuSales
  .map((entry) => {
    const product = products.find((p) => p.id === entry.productId);
    if (!product) throw new Error(`Unknown top SKU product id: ${entry.productId}`);
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      imageUrl: product.imageUrl,
      unitsSold: entry.unitsSold,
      revenue: entry.unitsSold * product.sellingPrice,
    };
  })
  .sort((a, b) => b.revenue - a.revenue);

// ---------------------------------------------------------------------------
// Stock alerts (cross-referenced against services/mockData/products.ts)
// ---------------------------------------------------------------------------

export interface StockAlertRow {
  id: string;
  name: string;
  stockQty: number;
  minThreshold: number;
  severity: 'critical' | 'low';
}

export const stockAlerts: StockAlertRow[] = products
  .filter((p) => stockStatus(p) !== 'in-stock')
  .map((p) => ({
    id: p.id,
    name: p.name,
    stockQty: p.stockQty,
    minThreshold: p.minThreshold,
    severity: (stockStatus(p) === 'out-of-stock' || p.stockQty <= p.minThreshold * 0.3 ? 'critical' : 'low') as 'critical' | 'low',
  }))
  .sort((a, b) => a.stockQty - b.stockQty);
