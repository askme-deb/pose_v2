import { apiClient } from './client';

export type DashboardTimeframe = 'today' | '7d' | '30d' | '90d';

export interface DashboardKpis {
  revenue: number;
  revenueDeltaPct: number;
  orders: number;
  ordersDeltaPct: number;
  profit: number;
  marginPct: number;
  avgTicket: number;
  avgTicketDeltaPct: number;
  lowStockSkus: number;
  criticalReorders: number;
}

export interface TrendPoint {
  label: string;
  revenue: number;
  profit: number;
}

export interface PaymentSplitSlice {
  method: 'UPI' | 'CARD' | 'CASH';
  pct: number;
}

export interface PerfPoint {
  name: string;
  amount: number;
}

export interface TopSkuRow {
  id: string;
  name: string;
  sku: string;
  imageUrl: string;
  unitsSold: number;
  revenue: number;
}

export interface TransactionRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  branch: string;
  paymentMethod: 'UPI' | 'CARD' | 'CASH';
  amount: number;
  createdAt: string;
}

export interface StockAlertRow {
  id: string;
  name: string;
  stockQty: number;
  minThreshold: number;
  severity: 'critical' | 'low';
}

export interface DashboardData {
  kpis: DashboardKpis;
  trend: TrendPoint[];
  paymentSplit: PaymentSplitSlice[];
  categoryPerformance: PerfPoint[];
  branchPerformance: PerfPoint[];
  topSkus: TopSkuRow[];
  transactions: TransactionRow[];
  stockAlerts: StockAlertRow[];
}

export async function getDashboard(timeframe: DashboardTimeframe): Promise<DashboardData> {
  return apiClient.get<DashboardData>(`/api/reporting/dashboard?timeframe=${timeframe}`);
}
