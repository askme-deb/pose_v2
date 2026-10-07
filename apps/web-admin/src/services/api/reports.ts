import { apiClient } from './client';

export interface DailyPerformance {
  date: string;
  label: string;
  revenue: number;
  profit: number;
  orders: number;
}

export interface PaymentSplit {
  method: string;
  percent: number;
  color: string;
  amount: number;
}

export interface ProductRow {
  productId: string;
  name: string;
  sku: string;
  categoryName: string;
  unitsSold: number;
  revenue: number;
  profit: number;
  marginPercent: number;
  stockQty: number;
  minThreshold: number;
  gstRate: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
}

export interface ReorderAlert {
  productId: string;
  name: string;
  sku: string;
  stockQty: number;
  minThreshold: number;
  categoryName: string;
  gstRate: number;
}

export interface VipCustomer {
  name: string;
  contact: string;
  tier: string;
  visits: number;
  lifetimeSpend: number;
  avgBasket: number;
  lastPurchase: string;
}

export interface CashierPerformance {
  name: string;
  terminal: string;
  invoicesHandled: number;
  revenue: number;
  avgBasket: number;
  voidCount: number;
}

export interface GstTaxSlab {
  ratePercent: number;
  slabLabel: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  total: number;
}

export interface AnalyticsReport {
  range: { from: string; to: string };
  kpi: {
    grossSales: number;
    netProfit: number;
    gst: number;
    orders: number;
    returns: number;
    aov: number;
    marginPct: number;
    returnsRate: number;
    cgst: number;
    sgst: number;
  };
  revenueSeries: DailyPerformance[];
  paymentMethodSplit: PaymentSplit[];
  hourlyFootfall: { hour: string; invoices: number }[];
  categoryMargin: { categoryId: string; label: string; grossSales: number; grossProfit: number }[];
  topProducts: ProductRow[];
  reorderAlerts: ReorderAlert[];
  crmStats: { newCustomers: number; newCustomersGrowthPct: number; avgLifetimeValue: number; walletCreditRedeemed: number };
  vipCustomers: VipCustomer[];
  cashierLeaderboard: CashierPerformance[];
  pnlStatement: {
    grossSales: number;
    discounts: number;
    returns: number;
    netOperatingRevenue: number;
    cogs: number;
    grossProfit: number;
    overheadLines: { label: string; amount: number }[];
    totalOverhead: number;
    finalNetOperatingProfit: number;
  };
  gstTaxSlabSummary: GstTaxSlab[];
  gstTotal: number;
  options: { branches: { value: string; label: string }[]; categories: { value: string; label: string }[] };
}

export const EMPTY_ANALYTICS: AnalyticsReport = {
  range: { from: '', to: '' },
  kpi: { grossSales: 0, netProfit: 0, gst: 0, orders: 0, returns: 0, aov: 0, marginPct: 0, returnsRate: 0, cgst: 0, sgst: 0 },
  revenueSeries: [],
  paymentMethodSplit: [],
  hourlyFootfall: [],
  categoryMargin: [],
  topProducts: [],
  reorderAlerts: [],
  crmStats: { newCustomers: 0, newCustomersGrowthPct: 0, avgLifetimeValue: 0, walletCreditRedeemed: 0 },
  vipCustomers: [],
  cashierLeaderboard: [],
  pnlStatement: { grossSales: 0, discounts: 0, returns: 0, netOperatingRevenue: 0, cogs: 0, grossProfit: 0, overheadLines: [], totalOverhead: 0, finalNetOperatingProfit: 0 },
  gstTaxSlabSummary: [],
  gstTotal: 0,
  options: { branches: [], categories: [] },
};

export interface AnalyticsQuery {
  from: Date;
  to: Date;
  storeId?: string;
  categoryId?: string;
  paymentMethod?: string;
}

function toQuery(q: AnalyticsQuery, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ from: q.from.toISOString(), to: q.to.toISOString(), ...extra });
  if (q.storeId) params.set('storeId', q.storeId);
  if (q.categoryId) params.set('categoryId', q.categoryId);
  if (q.paymentMethod) params.set('paymentMethod', q.paymentMethod);
  return params.toString();
}

export function getAnalytics(q: AnalyticsQuery) {
  return apiClient.get<AnalyticsReport>(`/api/reporting/reports/analytics?${toQuery(q)}`);
}

export async function downloadAnalytics(q: AnalyticsQuery, format: 'pdf' | 'xlsx', modules: string[]) {
  const { blob, filename } = await apiClient.download(`/api/reporting/reports/analytics/export?${toQuery(q, { format, modules: modules.join(',') })}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `PosPe_Analytics.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface ReportScheduleInput {
  email: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  format: 'PDF' | 'XLSX';
  modules: string[];
  storeId?: string;
}

export function createReportSchedule(input: ReportScheduleInput) {
  return apiClient.post<{ id: string }>('/api/reporting/reports/schedules', input);
}
