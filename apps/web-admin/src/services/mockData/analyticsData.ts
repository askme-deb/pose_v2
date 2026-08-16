import { products } from './products';

// ---------------------------------------------------------------------------
// Daily revenue / profit / orders performance series (Sales & Revenue Velocity)
// ---------------------------------------------------------------------------

export interface DailyPerformance {
  date: string;
  label: string;
  revenue: number;
  profit: number;
  orders: number;
}

export const revenueSeries: DailyPerformance[] = [
  { date: '2026-07-25', label: 'Jul 25', revenue: 312000, profit: 78000, orders: 1800 },
  { date: '2026-07-26', label: 'Jul 26', revenue: 345000, profit: 86250, orders: 1991 },
  { date: '2026-07-27', label: 'Jul 27', revenue: 298000, profit: 74500, orders: 1720 },
  { date: '2026-07-28', label: 'Jul 28', revenue: 410000, profit: 102500, orders: 2366 },
  { date: '2026-07-29', label: 'Jul 29', revenue: 385000, profit: 96250, orders: 2222 },
  { date: '2026-07-30', label: 'Jul 30', revenue: 420000, profit: 105000, orders: 2424 },
  { date: '2026-07-31', label: 'Jul 31', revenue: 390000, profit: 97500, orders: 2250 },
  { date: '2026-08-01', label: 'Aug 01', revenue: 285920, profit: 84180, orders: 1647 },
];

/** Total orders in the base ("Today"/current) period — the revenueSeries orders sum to this exactly. */
export const BASE_ORDERS = revenueSeries.reduce((sum, d) => sum + d.orders, 0);

// ---------------------------------------------------------------------------
// Payment method distribution (donut chart)
// ---------------------------------------------------------------------------

export interface PaymentSplit {
  method: string;
  percent: number;
  color: string;
}

export const paymentMethodSplit: PaymentSplit[] = [
  { method: 'UPI / QR', percent: 48.2, color: '#2563eb' },
  { method: 'Credit Card', percent: 28.4, color: '#9333ea' },
  { method: 'Cash Tender', percent: 17.8, color: '#10b981' },
  { method: 'Debit Card', percent: 5.6, color: '#f59e0b' },
];

// ---------------------------------------------------------------------------
// Hourly footfall / billing volume (bar chart)
// ---------------------------------------------------------------------------

export interface HourlyFootfall {
  hour: string;
  invoices: number;
}

export const hourlyFootfall: HourlyFootfall[] = [
  { hour: '8 AM', invoices: 120 },
  { hour: '9 AM', invoices: 240 },
  { hour: '10 AM', invoices: 410 },
  { hour: '11 AM', invoices: 680 },
  { hour: '12 PM', invoices: 890 },
  { hour: '1 PM', invoices: 750 },
  { hour: '2 PM', invoices: 620 },
  { hour: '3 PM', invoices: 580 },
  { hour: '4 PM', invoices: 710 },
  { hour: '5 PM', invoices: 940 },
  { hour: '6 PM', invoices: 1420 },
  { hour: '7 PM', invoices: 1680 },
  { hour: '8 PM', invoices: 1310 },
  { hour: '9 PM', invoices: 520 },
];

// ---------------------------------------------------------------------------
// Category-wise gross margin (horizontal bar chart)
// ---------------------------------------------------------------------------

export interface CategoryMargin {
  categoryId: string;
  label: string;
  grossSales: number;
  grossProfit: number;
}

export const categoryMargin: CategoryMargin[] = [
  { categoryId: 'cat-dairy', label: 'Dairy & Fresh', grossSales: 787360, grossProfit: 197578 },
  { categoryId: 'cat-beverages', label: 'Beverages', grossSales: 750600, grossProfit: 236502 },
  { categoryId: 'cat-confectionery', label: 'Confectionery', grossSales: 340200, grossProfit: 119070 },
  { categoryId: 'cat-gourmet', label: 'Gourmet Goods', grossSales: 802800, grossProfit: 224784 },
  { categoryId: 'cat-bakery', label: 'Bakery & Snacks', grossSales: 169600, grossProfit: 44096 },
];

// ---------------------------------------------------------------------------
// Top selling products — cross-referenced against products.ts by id.
// Revenue/profit/margin are derived from the product's real sellingPrice/costPrice
// so the numbers can never drift out of sync with the catalog.
// ---------------------------------------------------------------------------

export interface TopProduct {
  productId: string;
  unitsSold: number;
  revenue: number;
  profit: number;
  marginPercent: number;
}

const topProductUnitsSold: Record<string, number> = {
  'prd-001': 3120,
  'prd-002': 1180,
  'prd-003': 1890,
  'prd-004': 940,
  'prd-005': 640,
  'prd-006': 4820,
  'prd-007': 820,
  'prd-008': 1420,
  'prd-009': 560,
  'prd-010': 1680,
  'prd-011': 710,
  'prd-012': 980,
};

export const topProducts: TopProduct[] = products.map((p) => {
  const unitsSold = topProductUnitsSold[p.id] ?? 500;
  const revenue = unitsSold * p.sellingPrice;
  const profit = unitsSold * (p.sellingPrice - p.costPrice);
  const marginPercent = Math.round((profit / revenue) * 1000) / 10;
  return { productId: p.id, unitsSold, revenue, profit, marginPercent };
});

// ---------------------------------------------------------------------------
// High-velocity reorder alerts — references products already low/out of stock
// in products.ts (stockQty <= minThreshold).
// ---------------------------------------------------------------------------

export interface ReorderAlert {
  productId: string;
}

export const reorderAlerts: ReorderAlert[] = [
  { productId: 'prd-003' },
  { productId: 'prd-009' },
  { productId: 'prd-012' },
];

// ---------------------------------------------------------------------------
// Customer & Loyalty CRM
// ---------------------------------------------------------------------------

export interface CrmStats {
  newCustomers: number;
  newCustomersGrowthPct: number;
  avgLifetimeValue: number;
  loyaltyPointsRedeemed: number;
}

export const crmStats: CrmStats = {
  newCustomers: 412,
  newCustomersGrowthPct: 18.5,
  avgLifetimeValue: 14280,
  loyaltyPointsRedeemed: 48920,
};

export interface VipCustomer {
  name: string;
  contact: string;
  tier: 'Platinum Enterprise' | 'VIP Gold' | 'Silver Star';
  visits: number;
  lifetimeSpend: number;
  avgBasket: number;
  lastPurchase: string;
}

export const vipCustomers: VipCustomer[] = [
  { name: 'Sarah Jenkins', contact: '+91 98765 43210', tier: 'VIP Gold', visits: 42, lifetimeSpend: 124800, avgBasket: 2971, lastPurchase: '2026-08-16' },
  { name: 'TechCorp Corporate Pvt Ltd', contact: '+91 91234 56789', tier: 'Platinum Enterprise', visits: 28, lifetimeSpend: 345000, avgBasket: 12321, lastPurchase: '2026-08-15' },
  { name: 'David Miller', contact: '+91 99887 76655', tier: 'VIP Gold', visits: 31, lifetimeSpend: 89400, avgBasket: 2883, lastPurchase: '2026-08-14' },
  { name: 'Priya Sharma', contact: '+91 97766 55443', tier: 'Silver Star', visits: 19, lifetimeSpend: 42500, avgBasket: 2236, lastPurchase: '2026-08-13' },
  { name: 'Anita Roy', contact: '+91 96655 44332', tier: 'VIP Gold', visits: 26, lifetimeSpend: 78900, avgBasket: 3034, lastPurchase: '2026-08-12' },
  { name: 'Rohan Mehta', contact: '+91 95544 33221', tier: 'Silver Star', visits: 15, lifetimeSpend: 31200, avgBasket: 2080, lastPurchase: '2026-08-10' },
  { name: 'Kavita Desai', contact: '+91 94433 22110', tier: 'VIP Gold', visits: 34, lifetimeSpend: 96500, avgBasket: 2838, lastPurchase: '2026-08-09' },
  { name: 'Vikram Nair Enterprises', contact: '+91 93322 11009', tier: 'Platinum Enterprise', visits: 22, lifetimeSpend: 218000, avgBasket: 9909, lastPurchase: '2026-08-08' },
];

// ---------------------------------------------------------------------------
// Staff & Cashier Telemetry
// ---------------------------------------------------------------------------

export interface CashierPerformance {
  name: string;
  terminal: string;
  invoicesHandled: number;
  revenue: number;
  avgSpeedSeconds: number;
  voidCount: number;
  ratingStars: number;
}

export const cashierLeaderboard: CashierPerformance[] = [
  { name: 'Alex Wong', terminal: 'POS Register #01', invoicesHandled: 4820, revenue: 842100, avgSpeedSeconds: 42, voidCount: 2, ratingStars: 4.9 },
  { name: 'Elena Rostova', terminal: 'POS Register #02', invoicesHandled: 4120, revenue: 715400, avgSpeedSeconds: 48, voidCount: 5, ratingStars: 4.8 },
  { name: 'Marcus Chen', terminal: 'POS Express #03', invoicesHandled: 3950, revenue: 689000, avgSpeedSeconds: 39, voidCount: 1, ratingStars: 4.95 },
  { name: 'Sophia Gupta', terminal: 'POS Register #04', invoicesHandled: 3530, revenue: 601000, avgSpeedSeconds: 52, voidCount: 6, ratingStars: 4.7 },
  { name: 'Rajesh Kumar', terminal: 'POS Register #05', invoicesHandled: 3210, revenue: 548200, avgSpeedSeconds: 46, voidCount: 3, ratingStars: 4.6 },
  { name: 'Fatima Sheikh', terminal: 'POS Express #06', invoicesHandled: 2890, revenue: 492700, avgSpeedSeconds: 44, voidCount: 2, ratingStars: 4.85 },
];

// ---------------------------------------------------------------------------
// P&L Statement — every line is derived so the statement always adds up.
// ---------------------------------------------------------------------------

export interface OverheadLine {
  label: string;
  amount: number;
}

export interface PnlStatement {
  grossSales: number;
  discounts: number;
  returns: number;
  netOperatingRevenue: number;
  cogs: number;
  grossProfit: number;
  overheadLines: OverheadLine[];
  totalOverhead: number;
  finalNetOperatingProfit: number;
}

function buildPnlStatement(): PnlStatement {
  const grossSales = revenueSeries.reduce((sum, d) => sum + d.revenue, 0); // 2,845,920
  const discounts = 42180;
  const returns = 24120;
  const netOperatingRevenue = grossSales - discounts - returns;
  const cogs = 1925400;
  const grossProfit = netOperatingRevenue - cogs;
  const overheadLines: OverheadLine[] = [
    { label: 'Store Rent & Lease', amount: 65000 },
    { label: 'Staff Salaries & Payroll', amount: 42000 },
    { label: 'Utilities & Electricity', amount: 14040 },
    { label: 'SaaS Software Subscriptions', amount: 9000 },
  ];
  const totalOverhead = overheadLines.reduce((sum, l) => sum + l.amount, 0);
  const finalNetOperatingProfit = grossProfit - totalOverhead;

  return { grossSales, discounts, returns, netOperatingRevenue, cogs, grossProfit, overheadLines, totalOverhead, finalNetOperatingProfit };
}

export const pnlStatement: PnlStatement = buildPnlStatement();

// ---------------------------------------------------------------------------
// GST Tax Slab Summary — cgst = sgst = taxableAmount * rate / 2 / 100
// ---------------------------------------------------------------------------

export interface GstTaxSlab {
  ratePercent: number;
  slabLabel: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  total: number;
}

const gstSlabInputs: { ratePercent: number; slabLabel: string; taxableAmount: number }[] = [
  { ratePercent: 0, slabLabel: '0% Exempt', taxableAmount: 342000 },
  { ratePercent: 5, slabLabel: '5% GST', taxableAmount: 680000 },
  { ratePercent: 12, slabLabel: '12% GST', taxableAmount: 850000 },
  { ratePercent: 18, slabLabel: '18% GST', taxableAmount: 973920 },
  { ratePercent: 28, slabLabel: '28% GST', taxableAmount: 438245 },
];

export const gstTaxSlabSummary: GstTaxSlab[] = gstSlabInputs.map((s) => {
  const cgst = Math.round(((s.taxableAmount * s.ratePercent) / 2 / 100) * 100) / 100;
  const sgst = cgst;
  const total = Math.round((cgst + sgst) * 100) / 100;
  return { ...s, cgst, sgst, total };
});

export const gstTotal = gstTaxSlabSummary.reduce((sum, s) => sum + s.total, 0);
export const gstTaxableTotal = gstTaxSlabSummary.reduce((sum, s) => sum + s.taxableAmount, 0);

// ---------------------------------------------------------------------------
// Global filter bar option lists
// ---------------------------------------------------------------------------

export interface DatePresetOption {
  value: string;
  label: string;
  factor: number;
}

export const datePresetOptions: DatePresetOption[] = [
  { value: 'today', label: 'Today', factor: 1 },
  { value: 'yesterday', label: 'Yesterday', factor: 0.92 },
  { value: 'last7', label: 'Last 7 Days', factor: 6.4 },
  { value: 'last30', label: 'Last 30 Days', factor: 26.5 },
  { value: 'thisMonth', label: 'This Month', factor: 26.5 },
  { value: 'lastMonth', label: 'Last Month', factor: 25.8 },
];

export const branchOptions = [
  { value: 'all', label: 'All Branches Combined' },
  { value: 'downtown', label: 'Downtown Flagship' },
  { value: 'westside', label: 'Westside Mall Outlet' },
  { value: 'airport', label: 'Airport Express Kiosk' },
  { value: 'ecom', label: 'E-Commerce Store' },
];

export const categoryFilterOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'dairy', label: 'Dairy & Fresh' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'confectionery', label: 'Confectionery' },
  { value: 'gourmet', label: 'Gourmet Goods' },
  { value: 'bakery', label: 'Bakery & Snacks' },
];

export const paymentModeOptions = [
  { value: 'all', label: 'All Payment Modes' },
  { value: 'upi', label: 'UPI / QR Payment' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'cash', label: 'Cash Tender' },
  { value: 'debit', label: 'Debit Card' },
];
