import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { ColumnDef } from '@tanstack/react-table';
import {
  IndianRupee,
  ShoppingCart,
  ArrowUpRight,
  Receipt,
  AlertTriangle,
  Monitor,
  Activity,
  PieChart,
  BarChart2,
  Store,
  Clock,
  Download,
  RefreshCw,
  Eye,
  Search,
} from 'lucide-react';
import { GlassCard, KpiCard, PillTabs, Badge, DataTable, useToast, cn } from '@pospe/ui-library';
import { formatINR, formatCompactINR } from '../../utils/format';
import { useThemeStore } from '../../store/useThemeStore';
import { getDashboard, DashboardData, DashboardTimeframe, TransactionRow } from '../../services/api/dashboard';

const dashboardTimeframeOptions: { value: DashboardTimeframe; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

const TIMEFRAME_COMPARISON_LABEL: Record<DashboardTimeframe, string> = {
  today: 'vs yesterday',
  '7d': 'vs prior 7 days',
  '30d': 'vs prior 30 days',
  '90d': 'vs prior 90 days',
};

type PaymentColor = 'blue' | 'purple' | 'emerald';

const PAYMENT_META: Record<'UPI' | 'CARD' | 'CASH', { label: string; color: PaymentColor; hex: string }> = {
  UPI: { label: 'UPI / QR', color: 'blue', hex: '#3b82f6' },
  CARD: { label: 'Cards', color: 'purple', hex: '#a855f7' },
  CASH: { label: 'Cash', color: 'emerald', hex: '#10b981' },
};

// No real foot-traffic counter exists anywhere in the schema — this stays
// decorative flavor, same treatment as the Superadmin cluster/gateway panels.
const hourlyFootfall = [
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

const AMBER_RAMP = ['#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309'];

function amberForValue(value: number, min: number, max: number): string {
  if (max === min) return AMBER_RAMP[Math.floor(AMBER_RAMP.length / 2)];
  const ratio = (value - min) / (max - min);
  const idx = Math.min(AMBER_RAMP.length - 1, Math.floor(ratio * AMBER_RAMP.length));
  return AMBER_RAMP[idx];
}

function signed(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

function minutesAgoLabel(createdAt: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const { dark } = useThemeStore();
  const { showToast } = useToast();
  const [timeframe, setTimeframe] = useState<DashboardTimeframe>('today');
  const [widgetTab, setWidgetTab] = useState<'top-skus' | 'low-stock'>('top-skus');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  async function load(tf: DashboardTimeframe) {
    setLoading(true);
    try {
      const result = await getDashboard(tf);
      setData(result);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load dashboard data from the server', 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(timeframe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  const kpis = data?.kpis;
  const trend = data?.trend ?? [];
  const paymentSplit = data?.paymentSplit ?? [];
  const categoryPerf = data?.categoryPerformance ?? [];
  const branchPerf = data?.branchPerformance ?? [];
  const topSkus = data?.topSkus ?? [];
  const stockAlerts = data?.stockAlerts ?? [];
  const transactions = data?.transactions ?? [];

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) => t.invoiceNumber.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q),
    );
  }, [search, transactions]);

  const footfallMin = Math.min(...hourlyFootfall.map((h) => h.visitors));
  const footfallMax = Math.max(...hourlyFootfall.map((h) => h.visitors));

  // ---------------------------------------------------------------------
  // Chart configs
  // ---------------------------------------------------------------------

  const trendOptions: ApexOptions = useMemo(
    () => ({
      chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', foreColor: '#94a3b8', animations: { enabled: true } },
      colors: ['#2563eb', '#10b981'],
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0, stops: [0, 90, 100] } },
      dataLabels: { enabled: false },
      legend: { show: false },
      markers: { size: 0, hover: { size: 5 } },
      grid: { borderColor: dark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.25)', strokeDashArray: 4 },
      xaxis: {
        categories: trend.map((t) => t.label),
        labels: { style: { fontSize: '10px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tickAmount: trend.length > 20 ? 10 : undefined,
      },
      yaxis: { labels: { formatter: (v: number) => formatCompactINR(v), style: { fontSize: '10px' } } },
      tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: (v: number) => formatINR(v) } },
    }),
    [trend, dark],
  );

  const trendSeries = useMemo(
    () => [
      { name: 'Revenue', data: trend.map((t) => t.revenue) },
      { name: 'Profit', data: trend.map((t) => t.profit) },
    ],
    [trend],
  );

  const paymentOptions: ApexOptions = useMemo(
    () => ({
      chart: { type: 'donut', toolbar: { show: false }, fontFamily: 'inherit' },
      labels: paymentSplit.map((p) => PAYMENT_META[p.method].label),
      colors: paymentSplit.map((p) => PAYMENT_META[p.method].hex),
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { width: 2, colors: [dark ? '#0f172a' : '#ffffff'] },
      plotOptions: { pie: { donut: { size: '72%', labels: { show: false } } } },
      tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: (v: number) => `${v}%` } },
    }),
    [paymentSplit, dark],
  );

  const paymentSeries = useMemo(() => paymentSplit.map((p) => p.pct), [paymentSplit]);

  const categoryOptions: ApexOptions = useMemo(
    () => ({
      chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
      plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '55%' } },
      colors: ['#9333ea'],
      dataLabels: { enabled: false },
      grid: { borderColor: dark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.25)', strokeDashArray: 4 },
      xaxis: {
        categories: categoryPerf.map((c) => c.name),
        labels: { formatter: (v: string) => formatCompactINR(Number(v)), style: { fontSize: '10px' } },
        axisBorder: { show: false },
      },
      yaxis: { labels: { style: { fontSize: '10px' } } },
      tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: (v: number) => formatINR(v) } },
    }),
    [categoryPerf, dark],
  );

  const categorySeries = useMemo(() => [{ name: 'Revenue', data: categoryPerf.map((c) => c.amount) }], [categoryPerf]);

  const branchOptions: ApexOptions = useMemo(
    () => ({
      chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
      plotOptions: { bar: { horizontal: false, borderRadius: 6, columnWidth: '45%' } },
      colors: ['#2563eb'],
      dataLabels: { enabled: false },
      grid: { borderColor: dark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.25)', strokeDashArray: 4 },
      xaxis: { categories: branchPerf.map((b) => b.name), labels: { style: { fontSize: '9px' } }, axisBorder: { show: false } },
      yaxis: { labels: { formatter: (v: number) => formatCompactINR(v), style: { fontSize: '10px' } } },
      tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: (v: number) => formatINR(v) } },
    }),
    [branchPerf, dark],
  );

  const branchSeries = useMemo(() => [{ name: 'Revenue', data: branchPerf.map((b) => b.amount) }], [branchPerf]);

  const footfallOptions: ApexOptions = useMemo(
    () => ({
      chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%', distributed: true } },
      colors: hourlyFootfall.map((h) => amberForValue(h.visitors, footfallMin, footfallMax)),
      dataLabels: { enabled: false },
      legend: { show: false },
      grid: { borderColor: dark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.25)', strokeDashArray: 4 },
      xaxis: { categories: hourlyFootfall.map((h) => h.label), labels: { style: { fontSize: '9px' } }, axisBorder: { show: false } },
      yaxis: { labels: { style: { fontSize: '10px' } } },
      tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: (v: number) => `${v} visitors` } },
    }),
    [dark, footfallMin, footfallMax],
  );

  const footfallSeries = useMemo(() => [{ name: 'Footfall', data: hourlyFootfall.map((h) => h.visitors) }], []);

  // ---------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------

  function handleExport() {
    if (!kpis) return;
    downloadCsv(`dashboard-report-${timeframe}.csv`, [
      ['Metric', 'Value'],
      ['Revenue', kpis.revenue],
      ['Orders', kpis.orders],
      ['Net Profit', kpis.profit],
      ['Margin %', kpis.marginPct],
      ['Avg Ticket', kpis.avgTicket],
      ['Low Stock SKUs', kpis.lowStockSkus],
      [],
      ['Invoice', 'Customer', 'Branch', 'Payment', 'Amount'],
      ...transactions.map((t) => [t.invoiceNumber, t.customerName, t.branch, t.paymentMethod, t.amount]),
    ]);
    showToast('Dashboard report exported as CSV', 'success');
  }

  function handleRefresh() {
    setRefreshing(true);
    load(timeframe).finally(() => {
      setRefreshing(false);
      showToast('Dashboard data refreshed', 'success');
    });
  }

  const transactionColumns: ColumnDef<TransactionRow, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'invoiceNumber',
        header: 'Invoice',
        cell: ({ row }) => (
          <div>
            <span className="font-mono font-bold text-blue-600">#{row.original.invoiceNumber}</span>
            <div className="text-[10px] text-slate-400">{minutesAgoLabel(row.original.createdAt)}</div>
          </div>
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ row }) => <span className="font-semibold text-slate-800 dark:text-slate-200">{row.original.customerName}</span>,
      },
      {
        accessorKey: 'branch',
        header: 'Branch',
        cell: ({ row }) => <span className="text-slate-500 dark:text-slate-400">{row.original.branch}</span>,
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Payment',
        cell: ({ row }) => <Badge color={PAYMENT_META[row.original.paymentMethod].color}>{PAYMENT_META[row.original.paymentMethod].label}</Badge>,
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="block text-right font-black text-slate-900 dark:text-white">{formatINR(row.original.amount)}</span>
        ),
      },
      {
        id: 'receipt',
        header: 'Receipt',
        cell: ({ row }) => (
          <div className="flex justify-center">
            <button
              onClick={() => showToast(`Opening receipt for #${row.original.invoiceNumber}`, 'info')}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white transition text-slate-600 dark:text-slate-300"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [showToast],
  );

  return (
    <div className="space-y-8">
      {/* Header Bar with Filter & Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Executive Intelligence Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Live Stream
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time revenue telemetry, multi-branch performance analytics &amp; automated inventory alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PillTabs options={dashboardTimeframeOptions} value={timeframe} onChange={(v) => setTimeframe(v as DashboardTimeframe)} />

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Export Report</span>
            </button>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 transition shadow-sm"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 text-emerald-600', refreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          icon={IndianRupee}
          label={timeframe === 'today' ? "Today's Revenue" : 'Total Revenue'}
          value={formatINR(kpis?.revenue ?? 0)}
          delta={`${signed(kpis?.revenueDeltaPct ?? 0)} ${TIMEFRAME_COMPARISON_LABEL[timeframe]}`}
          deltaTone={(kpis?.revenueDeltaPct ?? 0) >= 0 ? 'positive' : 'negative'}
          color="blue"
        />
        <KpiCard
          icon={ShoppingCart}
          label="Total Orders"
          value={`${kpis?.orders ?? 0} Bills`}
          delta={`${signed(kpis?.ordersDeltaPct ?? 0)} ${TIMEFRAME_COMPARISON_LABEL[timeframe]}`}
          deltaTone={(kpis?.ordersDeltaPct ?? 0) >= 0 ? 'positive' : 'negative'}
          color="indigo"
        />
        <KpiCard
          icon={ArrowUpRight}
          label="Net Profit"
          value={formatINR(kpis?.profit ?? 0)}
          delta={`${kpis?.marginPct ?? 0}% Margin`}
          deltaTone="positive"
          color="emerald"
        />
        <KpiCard
          icon={Receipt}
          label="Avg Ticket Size"
          value={formatINR(kpis?.avgTicket ?? 0)}
          delta={`${signed(kpis?.avgTicketDeltaPct ?? 0)} basket value`}
          deltaTone={(kpis?.avgTicketDeltaPct ?? 0) >= 0 ? 'positive' : 'negative'}
          color="purple"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Low Stock Risk"
          value={`${kpis?.lowStockSkus ?? 0} SKUs`}
          delta={`${kpis?.criticalReorders ?? 0} Critical Reorders`}
          deltaTone="negative"
          color="amber"
        />
        <KpiCard
          icon={Monitor}
          label="POS Registers"
          value="6/6 Active"
          delta="100% Uptime"
          deltaTone="positive"
          color="cyan"
        />
      </div>

      {/* Section 1: Revenue & Profit Trend + Payment Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <GlassCard className="lg:col-span-8 space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Sales Revenue &amp; Net Profit Trajectory</span>
              </h3>
              <p className="text-xs text-slate-400">Comparing gross revenue against net profit margin across selected period</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <span className="w-3 h-1 rounded-full bg-blue-600" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-3 h-1 rounded-full bg-emerald-500" /> Profit
              </span>
            </div>
          </div>

          <div className="relative w-full h-80 min-h-[320px]">
            <Chart options={trendOptions} series={trendSeries} type="area" height="100%" width="100%" />
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-4 space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              <span>Payment Method Split</span>
            </h3>
            <p className="text-xs text-slate-400">Distribution of customer checkout payment modes</p>
          </div>

          <div className="relative w-full h-48 flex items-center justify-center">
            <Chart options={paymentOptions} series={paymentSeries} type="donut" height="100%" width="100%" />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Volume</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">{formatCompactINR(kpis?.revenue ?? 0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {paymentSplit.map((slice) => {
              const meta = PAYMENT_META[slice.method];
              return (
                <div
                  key={slice.method}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800"
                >
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
                    <span
                      className={cn(
                        'w-2.5 h-2.5 rounded-full',
                        meta.color === 'blue' && 'bg-blue-500',
                        meta.color === 'purple' && 'bg-purple-500',
                        meta.color === 'emerald' && 'bg-emerald-500',
                      )}
                    />
                    <span>{meta.label}</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-white">{slice.pct}%</span>
                    <span className="text-[10px] font-mono text-slate-400">{formatCompactINR(((kpis?.revenue ?? 0) * slice.pct) / 100)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Section 2: 3 Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-600" />
              <span>Top Sales Categories</span>
            </h3>
            <Link to="/inventory/categories" className="text-[11px] font-semibold text-blue-600 hover:underline">
              View Catalog
            </Link>
          </div>
          <div className="relative w-full h-56">
            <Chart options={categoryOptions} series={categorySeries} type="bar" height="100%" width="100%" />
          </div>
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-600" />
              <span>Branch Performance</span>
            </h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">{branchPerf.length} Outlets</span>
          </div>
          <div className="relative w-full h-56">
            <Chart options={branchOptions} series={branchSeries} type="bar" height="100%" width="100%" />
          </div>
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Hourly Footfall &amp; Peak Hours</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-semibold">Peak: 7 PM</span>
          </div>
          <div className="relative w-full h-56">
            <Chart options={footfallOptions} series={footfallSeries} type="bar" height="100%" width="100%" />
          </div>
        </GlassCard>
      </div>

      {/* Section 3: Data Tables & Live Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <GlassCard className="lg:col-span-7 space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Recent Sales Transactions</span>
              </h3>
              <p className="text-xs text-slate-400">Live bill stream from active POS checkout counters</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search invoice or customer..."
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 w-48"
                />
              </div>
              <Link
                to="/sales/invoices"
                className="px-3 py-1.5 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-xs font-bold hover:bg-blue-600 hover:text-white transition"
              >
                View All
              </Link>
            </div>
          </div>

          <DataTable
            columns={transactionColumns}
            data={filteredTransactions}
            loading={loading}
            pageSize={8}
            emptyTitle="No transactions found"
            emptyDescription="Try a different invoice number or customer name."
          />
        </GlassCard>

        <GlassCard className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <PillTabs
              options={[
                { value: 'top-skus', label: 'Top SKUs' },
                { value: 'low-stock', label: `Stock Alerts (${stockAlerts.length})` },
              ]}
              value={widgetTab}
              onChange={(v) => setWidgetTab(v as 'top-skus' | 'low-stock')}
            />
            <Link to="/inventory/products" className="text-[11px] text-blue-600 font-semibold hover:underline">
              Manage Catalog
            </Link>
          </div>

          {widgetTab === 'top-skus' ? (
            <div className="space-y-3">
              {topSkus.map((sku) => (
                <div
                  key={sku.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80"
                >
                  <div className="flex items-center gap-3">
                    <img src={sku.imageUrl} className="w-10 h-10 rounded-xl object-cover" alt={sku.name} />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{sku.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{sku.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-xs text-slate-900 dark:text-white">{sku.unitsSold} sold</div>
                    <div className="text-[10px] font-bold text-emerald-600">{formatINR(sku.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {stockAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-2xl border',
                    alert.severity === 'critical'
                      ? 'bg-red-500/5 dark:bg-red-500/10 border-red-500/20'
                      : 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20',
                  )}
                >
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className={cn('w-2 h-2 rounded-full', alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500')} />
                      {alert.name}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Stock:{' '}
                      <span className={cn('font-bold', alert.severity === 'critical' ? 'text-red-500' : 'text-amber-500')}>
                        {alert.stockQty} units left
                      </span>{' '}
                      (Min Threshold: {alert.minThreshold})
                    </p>
                  </div>
                  <Link
                    to="/purchases"
                    className={cn(
                      'px-3 py-1 rounded-xl text-white font-bold text-[10px] shadow-sm transition',
                      alert.severity === 'critical' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700',
                    )}
                  >
                    Draft PO
                  </Link>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
