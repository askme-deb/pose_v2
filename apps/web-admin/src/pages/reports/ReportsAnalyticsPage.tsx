import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BarChart3,
  RefreshCw,
  Clock,
  FileSpreadsheet,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  RotateCcw,
  Activity,
  PieChart,
  PackageSearch,
  Tags,
  AlertTriangle,
  Trophy,
  Search,
  UserPlus,
  Award,
  Sparkles,
  Crown,
  UserCheck,
  Calculator,
  FileCheck2,
  Box,
  Star,
  FileText,
} from 'lucide-react';
import {
  GlassCard,
  KpiCard,
  PillTabs,
  Button,
  Input,
  Select,
  Badge,
  DataTable,
  Modal,
  Checkbox,
  useToast,
  cn,
  type BadgeColor,
} from '@pospe/ui-library';
import { formatINR, formatDate } from '../../utils/format';
import { useThemeStore } from '../../store/useThemeStore';
import { products, stockStatus as computeStockStatus, type Product } from '../../services/mockData/products';
import { categories } from '../../services/mockData/categories';
import {
  revenueSeries,
  paymentMethodSplit,
  hourlyFootfall,
  categoryMargin,
  topProducts,
  reorderAlerts,
  crmStats,
  vipCustomers,
  cashierLeaderboard,
  pnlStatement,
  gstTaxSlabSummary,
  gstTotal,
  branchOptions,
  categoryFilterOptions,
  paymentModeOptions,
  datePresetOptions,
  BASE_ORDERS,
  type VipCustomer,
  type CashierPerformance,
  type GstTaxSlab,
} from '../../services/mockData/analyticsData';

type TabValue = 'sales' | 'products' | 'crm' | 'cashier' | 'financial';
type ChartMetric = 'revenue' | 'profit' | 'orders';

const tabOptions: { value: TabValue; label: string }[] = [
  { value: 'sales', label: 'Sales & Revenue Velocity' },
  { value: 'products', label: 'Product & Inventory Matrix' },
  { value: 'crm', label: 'Customer & Loyalty CRM' },
  { value: 'cashier', label: 'Staff & Cashier Telemetry' },
  { value: 'financial', label: 'P&L & Tax Audit Suite' },
];

interface ProductRow {
  productId: string;
  name: string;
  sku: string;
  categoryName: string;
  unitsSold: number;
  revenue: number;
  profit: number;
  marginPercent: number;
  stockQty: number;
  gstRate: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
}

function buildProductRow(productId: string, unitsSold: number, revenue: number, profit: number, marginPercent: number): ProductRow {
  const product = products.find((p) => p.id === productId) as Product;
  const category = categories.find((c) => c.id === product.categoryId);
  return {
    productId,
    name: product.name,
    sku: product.sku,
    categoryName: category?.name ?? 'Uncategorized',
    unitsSold,
    revenue,
    profit,
    marginPercent,
    stockQty: product.stockQty,
    gstRate: product.gstRate,
    status: computeStockStatus(product),
  };
}

function stockBadgeColor(status: ProductRow['status']): BadgeColor {
  if (status === 'out-of-stock') return 'red';
  if (status === 'low-stock') return 'amber';
  return 'emerald';
}

function stockBadgeText(row: ProductRow): string {
  if (row.status === 'out-of-stock') return 'Out of Stock';
  if (row.status === 'low-stock') return `Low (${row.stockQty} left)`;
  return `In Stock (${row.stockQty})`;
}

function gstSlabColor(ratePercent: number): BadgeColor {
  if (ratePercent === 0) return 'slate';
  if (ratePercent === 5) return 'blue';
  if (ratePercent === 12) return 'cyan';
  if (ratePercent === 18) return 'purple';
  return 'red';
}

function StarRating({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center justify-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn('w-3 h-3', i <= rounded ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700')}
          />
        ))}
      </div>
      <span className="font-bold text-amber-500">{value.toFixed(2).replace(/0$/, '').replace(/\.$/, '.0')}</span>
    </div>
  );
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsAnalyticsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { dark } = useThemeStore();

  const [activeTab, setActiveTab] = useState<TabValue>('sales');
  const [datePreset, setDatePreset] = useState('today');
  const [customStart, setCustomStart] = useState('2026-08-16');
  const [customEnd, setCustomEnd] = useState('2026-08-16');
  const [branchFilter, setBranchFilter] = useState('downtown');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('revenue');
  const [productSearch, setProductSearch] = useState('');

  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncLabel, setLastSyncLabel] = useState('Live Sync: Active');

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [exportModules, setExportModules] = useState({ kpi: true, topSku: true, gst: true });
  const [scheduleEmail, setScheduleEmail] = useState('executive.management@apexpos.com');
  const [scheduleFrequency, setScheduleFrequency] = useState('Daily at 8:00 AM (Morning Recap)');

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // ---------------------------------------------------------------------
  // KPI computation — scales the base (current) period figures by the
  // active date preset's factor, mirroring the HTML prototype's behaviour.
  // ---------------------------------------------------------------------
  const kpi = useMemo(() => {
    const preset = datePresetOptions.find((d) => d.value === datePreset) ?? datePresetOptions[0];
    const factor = preset.factor;
    const grossSales = Math.round(pnlStatement.grossSales * factor);
    const netProfit = Math.round(pnlStatement.finalNetOperatingProfit * factor);
    const gst = Math.round(gstTotal * factor);
    const orders = Math.round(BASE_ORDERS * factor);
    const returns = Math.round(pnlStatement.returns * factor);
    const aov = orders > 0 ? grossSales / orders : 0;
    const marginPct = grossSales > 0 ? (netProfit / grossSales) * 100 : 0;
    const returnsRate = grossSales > 0 ? (returns / grossSales) * 100 : 0;
    return {
      grossSales,
      netProfit,
      gst,
      orders,
      returns,
      aov,
      marginPct,
      returnsRate,
      cgst: gst / 2,
      sgst: gst / 2,
    };
  }, [datePreset]);

  // ---------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------
  function handleDatePreset(value: string) {
    setDatePreset(value);
    const preset = datePresetOptions.find((d) => d.value === value);
    showToast(`Analytics filtered for preset: ${(preset?.label ?? value).toUpperCase()}`, 'info');
  }

  function notifyFiltersApplied(branch: string, category: string) {
    showToast(`Filter applied: Branch [${branch.toUpperCase()}], Category [${category.toUpperCase()}]`, 'success');
  }

  // ---------------------------------------------------------------------
  // Title banner actions
  // ---------------------------------------------------------------------
  function handleRefresh() {
    setRefreshing(true);
    setLastSyncLabel('Syncing...');
    showToast('Syncing real-time terminal telemetry...', 'info');
    setTimeout(() => {
      setRefreshing(false);
      setLastSyncLabel('Live Sync: Just now');
      showToast('All reports and analytics updated with latest sales data!', 'success');
    }, 800);
  }

  function handleExportCsv() {
    const stamp = new Date().toISOString().slice(0, 10);
    if (activeTab === 'products') {
      downloadCsv(
        `ApexPOS_TopProducts_${stamp}.csv`,
        ['Product Name', 'SKU', 'Category', 'Units Sold', 'Revenue (INR)', 'Profit (INR)', 'Margin (%)'],
        productRows.map((r) => [r.name, r.sku, r.categoryName, r.unitsSold, r.revenue, r.profit, r.marginPercent]),
      );
    } else if (activeTab === 'crm') {
      downloadCsv(
        `ApexPOS_VipCustomers_${stamp}.csv`,
        ['Customer Name', 'Contact', 'Tier', 'Visits', 'Lifetime Spend (INR)', 'Avg Basket (INR)', 'Last Purchase'],
        vipCustomers.map((c) => [c.name, c.contact, c.tier, c.visits, c.lifetimeSpend, c.avgBasket, c.lastPurchase]),
      );
    } else if (activeTab === 'cashier') {
      downloadCsv(
        `ApexPOS_CashierLeaderboard_${stamp}.csv`,
        ['Cashier Name', 'Terminal', 'Invoices Handled', 'Revenue (INR)', 'Avg Speed (sec/bill)', 'Void Count', 'Rating'],
        cashierLeaderboard.map((c) => [c.name, c.terminal, c.invoicesHandled, c.revenue, c.avgSpeedSeconds, c.voidCount, c.ratingStars]),
      );
    } else if (activeTab === 'financial') {
      downloadCsv(
        `ApexPOS_GSTTaxSlabs_${stamp}.csv`,
        ['Tax Slab', 'Taxable Amount (INR)', 'CGST (INR)', 'SGST (INR)', 'Total Tax (INR)'],
        gstTaxSlabSummary.map((g) => [g.slabLabel, g.taxableAmount, g.cgst, g.sgst, g.total]),
      );
    } else {
      downloadCsv(
        `ApexPOS_RevenuePerformance_${stamp}.csv`,
        ['Date', 'Revenue (INR)', 'Profit (INR)', 'Orders'],
        revenueSeries.map((d) => [d.date, d.revenue, d.profit, d.orders]),
      );
    }
    showToast('CSV Report Downloaded Successfully!', 'success');
  }

  function handleDownloadReport() {
    showToast(`Generating ${exportFormat.toUpperCase()} report file...`, 'info');
    setTimeout(() => {
      showToast(`ApexPOS_Analytics_Report_${Date.now()}.${exportFormat}`, 'success');
      setExportModalOpen(false);
    }, 1000);
  }

  function handleScheduleSave() {
    showToast('Automated schedule saved successfully!', 'success');
    setScheduleModalOpen(false);
  }

  function handleChartMetric(metric: ChartMetric) {
    setChartMetric(metric);
    showToast(`Chart updated to view ${metric.toUpperCase()}`, 'info');
  }

  // ---------------------------------------------------------------------
  // Product & Inventory Matrix data
  // ---------------------------------------------------------------------
  const allProductRows: ProductRow[] = useMemo(
    () => topProducts.map((tp) => buildProductRow(tp.productId, tp.unitsSold, tp.revenue, tp.profit, tp.marginPercent)),
    [],
  );

  const productRows = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return allProductRows;
    return allProductRows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q) || r.categoryName.toLowerCase().includes(q),
    );
  }, [allProductRows, productSearch]);

  const selectedProductRow = useMemo(
    () => allProductRows.find((r) => r.productId === selectedProductId) ?? null,
    [allProductRows, selectedProductId],
  );

  function openProductModal(productId: string) {
    setSelectedProductId(productId);
    setProductModalOpen(true);
  }

  function handleReorderPo(row: ProductRow) {
    showToast(`Reorder PO drafted for ${row.sku}`, 'success');
    navigate('/purchases');
  }

  function handleCreateSupplierPo() {
    showToast('PO order draft created!', 'success');
    setProductModalOpen(false);
    navigate('/purchases');
  }

  const productColumns: ColumnDef<ProductRow, any>[] = useMemo(
    () => [
      {
        id: 'product',
        header: 'Product Details',
        accessorKey: 'name',
        cell: ({ row }) => (
          <div>
            <div className="font-bold text-slate-900 dark:text-white">{row.original.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">{row.original.sku}</div>
          </div>
        ),
      },
      {
        accessorKey: 'categoryName',
        header: 'Category',
        cell: (info) => <span className="font-semibold text-slate-600 dark:text-slate-300">{info.getValue<string>()}</span>,
      },
      {
        accessorKey: 'unitsSold',
        header: 'Units Sold',
        cell: (info) => <div className="text-right font-bold">{info.getValue<number>().toLocaleString('en-IN')} units</div>,
      },
      {
        accessorKey: 'revenue',
        header: 'Total Revenue',
        cell: (info) => <div className="text-right font-black text-slate-900 dark:text-white">{formatINR(info.getValue<number>())}</div>,
      },
      {
        accessorKey: 'profit',
        header: 'Gross Profit',
        cell: (info) => <div className="text-right font-bold text-emerald-600 dark:text-emerald-400">{formatINR(info.getValue<number>())}</div>,
      },
      {
        accessorKey: 'marginPercent',
        header: 'Margin %',
        cell: (info) => (
          <div className="text-center">
            <Badge color="blue">{info.getValue<number>()}%</Badge>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Stock Status',
        accessorKey: 'status',
        cell: ({ row }) => (
          <div className="text-center">
            <Badge color={stockBadgeColor(row.original.status)}>{stockBadgeText(row.original)}</Badge>
          </div>
        ),
      },
      {
        id: 'action',
        header: 'Action',
        cell: ({ row }) => (
          <div className="text-right">
            <button
              onClick={() => openProductModal(row.original.productId)}
              className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white font-bold text-[11px] transition"
            >
              View Details
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  // ---------------------------------------------------------------------
  // CRM columns
  // ---------------------------------------------------------------------
  const vipColumns: ColumnDef<VipCustomer, any>[] = useMemo(
    () => [
      {
        id: 'customer',
        header: 'Customer Name & Contact',
        accessorKey: 'name',
        cell: ({ row }) => (
          <div>
            <div className="font-bold text-slate-900 dark:text-white">{row.original.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">{row.original.contact}</div>
          </div>
        ),
      },
      {
        accessorKey: 'tier',
        header: 'Loyalty Tier',
        cell: (info) => (
          <Badge color="amber" pill>
            {info.getValue<string>()}
          </Badge>
        ),
      },
      {
        accessorKey: 'visits',
        header: 'Visits Count',
        cell: (info) => <div className="text-center font-bold">{info.getValue<number>()} visits</div>,
      },
      {
        accessorKey: 'lifetimeSpend',
        header: 'Lifetime Spend',
        cell: (info) => <div className="text-right font-black text-slate-900 dark:text-white">{formatINR(info.getValue<number>())}</div>,
      },
      {
        accessorKey: 'avgBasket',
        header: 'Avg Order Basket',
        cell: (info) => <div className="text-right font-semibold text-blue-600 dark:text-blue-400">{formatINR(info.getValue<number>())}</div>,
      },
      {
        accessorKey: 'lastPurchase',
        header: 'Last Purchase',
        cell: (info) => <div className="text-center text-slate-400 text-[11px]">{formatDate(info.getValue<string>())}</div>,
      },
      {
        id: 'action',
        header: 'Action',
        cell: ({ row }) => (
          <div className="text-right">
            <button
              onClick={() => showToast(`Customer profile loaded for ${row.original.name}`, 'info')}
              className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white font-bold text-[11px] transition"
            >
              CRM Profile
            </button>
          </div>
        ),
      },
    ],
    [showToast],
  );

  // ---------------------------------------------------------------------
  // Cashier columns
  // ---------------------------------------------------------------------
  const cashierColumns: ColumnDef<CashierPerformance, any>[] = useMemo(
    () => [
      { accessorKey: 'name', header: 'Cashier Name', cell: (info) => <span className="font-bold text-slate-900 dark:text-white">{info.getValue<string>()}</span> },
      { accessorKey: 'terminal', header: 'Register Terminal', cell: (info) => <span className="text-slate-500 dark:text-slate-400 font-medium">{info.getValue<string>()}</span> },
      { accessorKey: 'invoicesHandled', header: 'Invoices Handled', cell: (info) => <div className="text-center font-bold">{info.getValue<number>().toLocaleString('en-IN')}</div> },
      { accessorKey: 'revenue', header: 'Revenue Generated', cell: (info) => <div className="text-right font-black text-slate-900 dark:text-white">{formatINR(info.getValue<number>())}</div> },
      { accessorKey: 'avgSpeedSeconds', header: 'Avg Speed/Bill', cell: (info) => <div className="text-center font-semibold text-blue-600 dark:text-blue-400">{info.getValue<number>()} sec/bill</div> },
      { accessorKey: 'voidCount', header: 'Void/Return Count', cell: (info) => <div className="text-center font-semibold text-rose-500">{info.getValue<number>()} voids</div> },
      { accessorKey: 'ratingStars', header: 'Performance Rating', cell: (info) => <StarRating value={info.getValue<number>()} /> },
      {
        id: 'audit',
        header: 'Audit',
        cell: ({ row }) => (
          <div className="text-right">
            <button
              onClick={() => showToast(`Register log requested for ${row.original.name}`, 'info')}
              className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white font-bold text-[11px] transition"
            >
              Audit
            </button>
          </div>
        ),
      },
    ],
    [showToast],
  );

  // ---------------------------------------------------------------------
  // GST columns
  // ---------------------------------------------------------------------
  const gstColumns: ColumnDef<GstTaxSlab, any>[] = useMemo(
    () => [
      {
        accessorKey: 'slabLabel',
        header: 'Tax Slab',
        cell: (info) => <Badge color={gstSlabColor(info.row.original.ratePercent)}>{info.getValue<string>()}</Badge>,
      },
      { accessorKey: 'taxableAmount', header: 'Taxable Amount', cell: (info) => <div className="text-right">{formatINR(info.getValue<number>())}</div> },
      { accessorKey: 'cgst', header: 'CGST', cell: (info) => <div className="text-right text-slate-500 dark:text-slate-400">{formatINR(info.getValue<number>())}</div> },
      { accessorKey: 'sgst', header: 'SGST', cell: (info) => <div className="text-right text-slate-500 dark:text-slate-400">{formatINR(info.getValue<number>())}</div> },
      { accessorKey: 'total', header: 'Total Tax', cell: (info) => <div className="text-right font-black text-slate-900 dark:text-white">{formatINR(info.getValue<number>())}</div> },
    ],
    [],
  );

  // ---------------------------------------------------------------------
  // Chart configs
  // ---------------------------------------------------------------------
  const textColor = dark ? '#94a3b8' : '#64748b';
  const gridColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const fontFamily = 'Plus Jakarta Sans, Inter, sans-serif';

  const activeSeriesConfig = useMemo(() => {
    if (chartMetric === 'profit') {
      return { name: 'Net Profit (₹)', data: revenueSeries.map((d) => d.profit), color: '#10b981', money: true };
    }
    if (chartMetric === 'orders') {
      return { name: 'Orders Count', data: revenueSeries.map((d) => d.orders), color: '#9333ea', money: false };
    }
    return { name: 'Gross Sales (₹)', data: revenueSeries.map((d) => d.revenue), color: '#3b82f6', money: true };
  }, [chartMetric]);

  const lineChartOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily, background: 'transparent' },
    colors: [activeSeriesConfig.color],
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
    dataLabels: { enabled: false },
    markers: { size: 4, strokeWidth: 0 },
    xaxis: {
      categories: revenueSeries.map((d) => d.label),
      labels: { style: { colors: textColor, fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: textColor, fontSize: '11px' },
        formatter: (v: number) => (activeSeriesConfig.money ? `₹${Math.round(v / 1000)}K` : `${Math.round(v)}`),
      },
    },
    grid: { borderColor: gridColor, strokeDashArray: 4 },
    tooltip: {
      theme: dark ? 'dark' : 'light',
      y: { formatter: (v: number) => (activeSeriesConfig.money ? formatINR(v) : `${v.toLocaleString('en-IN')} orders`) },
    },
    legend: { show: false },
  };
  const lineChartSeries = [{ name: activeSeriesConfig.name, data: activeSeriesConfig.data }];

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily, background: 'transparent' },
    labels: paymentMethodSplit.map((p) => p.method),
    colors: paymentMethodSplit.map((p) => p.color),
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            total: { show: true, label: 'Total Tenders', color: textColor, formatter: () => '100%' },
            value: { color: dark ? '#f1f5f9' : '#0f172a', fontWeight: 800 },
          },
        },
      },
    },
    tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: (v: number) => `${v}%` } },
  };
  const donutSeries = paymentMethodSplit.map((p) => p.percent);

  const footfallOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily, background: 'transparent' },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
    colors: ['#f59e0b'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: hourlyFootfall.map((h) => h.hour),
      labels: { style: { colors: textColor, fontSize: '10px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: textColor, fontSize: '11px' } } },
    grid: { borderColor: gridColor, strokeDashArray: 4 },
    legend: { show: false },
    tooltip: { theme: dark ? 'dark' : 'light' },
  };
  const footfallSeries = [{ name: 'Invoices Issued', data: hourlyFootfall.map((h) => h.invoices) }];

  const peakIdx = hourlyFootfall.reduce((maxI, cur, i, arr) => (cur.invoices > arr[maxI].invoices ? i : maxI), 0);
  const peakLabel = `${hourlyFootfall[Math.max(0, peakIdx - 1)].hour} - ${hourlyFootfall[Math.min(hourlyFootfall.length - 1, peakIdx + 1)].hour}`;

  const categoryChartOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily, background: 'transparent' },
    plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '55%' } },
    colors: ['#3b82f6', '#10b981'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: categoryMargin.map((c) => c.label),
      labels: { style: { colors: textColor, fontSize: '11px' } },
    },
    yaxis: { labels: { style: { colors: textColor, fontSize: '11px' } } },
    grid: { borderColor: gridColor, strokeDashArray: 4 },
    legend: { labels: { colors: textColor }, position: 'top', horizontalAlign: 'left' },
    tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: (v: number) => formatINR(v) } },
  };
  const categoryChartSeries = [
    { name: 'Gross Sales', data: categoryMargin.map((c) => c.grossSales) },
    { name: 'Gross Profit', data: categoryMargin.map((c) => c.grossProfit) },
  ];

  return (
    <>
      {/* Title & Quick Actions Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/30 border border-blue-400/30 text-blue-400 shadow-inner">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">Business Intelligence &amp; Analytics Hub</h1>
              <p className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                <span>Multi-branch financial telemetry, sales velocity &amp; GST intelligence</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                <span className="text-emerald-400 font-semibold">{lastSyncLabel}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <RefreshCw className={cn('w-4 h-4 text-blue-400', refreshing && 'animate-spin')} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setScheduleModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Schedule Email</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/30 transition transform hover:scale-[1.02]"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <GlassCard padding="sm" className="space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {datePresetOptions.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleDatePreset(preset.value)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition',
                  datePreset === preset.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <Calendar className="w-4 h-4 ml-1 text-slate-400" />
              <input
                type="date"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  notifyFiltersApplied(branchFilter, categoryFilter);
                }}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold outline-none text-xs"
              />
              <span className="text-slate-400 font-medium">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  notifyFiltersApplied(branchFilter, categoryFilter);
                }}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold outline-none text-xs"
              />
            </div>

            <Select
              options={branchOptions}
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                notifyFiltersApplied(e.target.value, categoryFilter);
              }}
              className="!py-2 !rounded-2xl w-auto"
            />
            <Select
              options={categoryFilterOptions}
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                notifyFiltersApplied(branchFilter, e.target.value);
              }}
              className="!py-2 !rounded-2xl w-auto"
            />
            <Select
              options={paymentModeOptions}
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                notifyFiltersApplied(branchFilter, categoryFilter);
              }}
              className="!py-2 !rounded-2xl w-auto"
            />
          </div>
        </div>
      </GlassCard>

      {/* Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={TrendingUp}
          label="Gross Sales"
          value={formatINR(kpi.grossSales)}
          delta="+14.8%"
          deltaTone="positive"
          color="blue"
        />
        <KpiCard
          icon={DollarSign}
          label="Net Profit"
          value={formatINR(kpi.netProfit)}
          delta={`${kpi.marginPct.toFixed(1)}% Margin`}
          deltaTone="positive"
          color="emerald"
        />
        <KpiCard
          icon={Receipt}
          label="GST Tax Liability"
          value={formatINR(kpi.gst)}
          delta="CGST + SGST"
          deltaTone="neutral"
          color="purple"
        />
        <KpiCard
          icon={Users}
          label="Loyalty &amp; CRM"
          value="68.4%"
          delta="+4.1% vs avg"
          deltaTone="positive"
          color="amber"
        />
        <KpiCard
          icon={RotateCcw}
          label="Returns &amp; Voids"
          value={formatINR(kpi.returns)}
          delta={`${kpi.returnsRate.toFixed(2)}% Rate`}
          deltaTone="positive"
          color="red"
        />
      </div>

      {/* Tab Navigation */}
      <PillTabs options={tabOptions} value={activeTab} onChange={(v) => setActiveTab(v as TabValue)} />

      {/* TAB: SALES & REVENUE VELOCITY */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span>Revenue &amp; Profit Performance Curve</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Historical revenue trajectory vs profit margin bounds</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  {(['revenue', 'profit', 'orders'] as ChartMetric[]).map((metric) => (
                    <button
                      key={metric}
                      onClick={() => handleChartMetric(metric)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg capitalize transition',
                        chartMetric === metric
                          ? 'font-bold bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800',
                      )}
                    >
                      {metric}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[320px] w-full">
                <Chart key={`line-${dark}-${chartMetric}`} options={lineChartOptions} series={lineChartSeries} type="area" height="100%" />
              </div>
            </GlassCard>

            <GlassCard className="flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-purple-600" />
                  <span>Payment Method Distribution</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Share of total tender volume across channels</p>
              </div>
              <div className="h-[220px] w-full flex items-center justify-center">
                <Chart key={`donut-${dark}`} options={donutOptions} series={donutSeries} type="donut" height="100%" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-800">
                {paymentMethodSplit.map((p) => (
                  <div
                    key={p.method}
                    className="flex items-center justify-between p-2 rounded-xl border"
                    style={{ backgroundColor: `${p.color}0d`, borderColor: `${p.color}1a` }}
                  >
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.method}
                    </span>
                    <span className="font-black text-slate-900 dark:text-white">{p.percent}%</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Hourly Footfall &amp; Billing Volume Heatmap</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Identify peak traffic hours to optimize cashier scheduling &amp; checkout lanes</p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs">
                Peak Hour: {peakLabel}
              </span>
            </div>
            <div className="h-[240px] w-full">
              <Chart key={`footfall-${dark}`} options={footfallOptions} series={footfallSeries} type="bar" height="100%" />
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB: PRODUCT & INVENTORY MATRIX */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard className="lg:col-span-2 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Tags className="w-4 h-4 text-indigo-600" />
                  <span>Category-wise Gross Margin &amp; Revenue</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Profit contribution breakdown by product vertical</p>
              </div>
              <div className="h-[250px] w-full">
                <Chart key={`cat-${dark}`} options={categoryChartOptions} series={categoryChartSeries} type="bar" height="100%" />
              </div>
            </GlassCard>

            <GlassCard className="space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>High Velocity Reorder Alerts</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Top performing items reaching safety stock thresholds</p>
              </div>

              <div className="space-y-3">
                {reorderAlerts.map((alert) => {
                  const product = products.find((p) => p.id === alert.productId);
                  if (!product) return null;
                  return (
                    <div
                      key={alert.productId}
                      className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">{product.name}</h4>
                        <span className="text-[10px] text-slate-400">
                          {product.sku} | {product.stockQty} units left
                        </span>
                      </div>
                      <button
                        onClick={() => handleReorderPo(buildProductRow(product.id, 0, 0, 0, 0))}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition whitespace-nowrap"
                      >
                        Reorder PO
                      </button>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>

          <GlassCard padding="sm" className="!p-0 overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Top Selling Products &amp; Profitability Matrix</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Detailed sales performance, volume, turnover &amp; margin per SKU</p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search product name or SKU..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
            <div className="p-6">
              <DataTable columns={productColumns} data={productRows} pageSize={10} emptyTitle="No matching products" emptyDescription="Try a different search term." />
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB: CUSTOMER & LOYALTY CRM */}
      {activeTab === 'crm' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard padding="sm" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase">New Customers Acquired</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{crmStats.newCustomers} buyers</div>
                <div className="text-[11px] text-emerald-500 font-bold mt-0.5">+{crmStats.newCustomersGrowthPct}% this period</div>
              </div>
            </GlassCard>

            <GlassCard padding="sm" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase">Avg Customer Lifetime Value</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{formatINR(crmStats.avgLifetimeValue)}</div>
                <div className="text-[11px] text-blue-500 font-bold mt-0.5">Top Tier VIP cohort</div>
              </div>
            </GlassCard>

            <GlassCard padding="sm" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase">Loyalty Points Redeemed</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{crmStats.loyaltyPointsRedeemed.toLocaleString('en-IN')} pts</div>
                <div className="text-[11px] text-purple-500 font-bold mt-0.5">Value {formatINR(crmStats.loyaltyPointsRedeemed)} credit</div>
              </div>
            </GlassCard>
          </div>

          <GlassCard padding="sm" className="!p-0 overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-200/80 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Top Spenders &amp; VIP Customer Intelligence</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">High-frequency shoppers &amp; loyalty tier breakdown</p>
            </div>
            <div className="p-6">
              <DataTable columns={vipColumns} data={vipCustomers} pageSize={10} />
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB: STAFF & CASHIER TELEMETRY */}
      {activeTab === 'cashier' && (
        <div className="space-y-6">
          <GlassCard padding="sm" className="!p-0 overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-200/80 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Cashier &amp; Register Velocity Leaderboard</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Checkout speed, revenue per cashier, void frequency &amp; performance rating</p>
            </div>
            <div className="p-6">
              <DataTable columns={cashierColumns} data={cashierLeaderboard} pageSize={10} />
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB: P&L & TAX AUDIT SUITE */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>Executive Profit &amp; Loss Statement (P&amp;L)</span>
                </h3>
                <span className="text-xs font-semibold text-slate-400">Current Period</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/50">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Gross Sales Revenue</span>
                  <span className="font-black text-slate-900 dark:text-white">{formatINR(pnlStatement.grossSales)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/50 text-rose-500">
                  <span>Less: Trade Discounts &amp; Promo Allowance</span>
                  <span className="font-semibold">-{formatINR(pnlStatement.discounts)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/50 text-rose-500">
                  <span>Less: Customer Returns &amp; Refunds</span>
                  <span className="font-semibold">-{formatINR(pnlStatement.returns)}</span>
                </div>
                <div className="flex items-center justify-between py-2 bg-blue-500/5 px-3 rounded-xl font-bold text-blue-600 dark:text-blue-400">
                  <span>NET OPERATING REVENUE</span>
                  <span className="text-sm">{formatINR(pnlStatement.netOperatingRevenue)}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/50 text-amber-600 dark:text-amber-400 pt-3">
                  <span>Less: Cost of Goods Sold (COGS)</span>
                  <span className="font-bold">-{formatINR(pnlStatement.cogs)}</span>
                </div>
                <div className="flex items-center justify-between py-2 bg-emerald-500/5 px-3 rounded-xl font-bold text-emerald-600 dark:text-emerald-400">
                  <span>GROSS PROFIT MARGIN</span>
                  <span className="text-sm">
                    {formatINR(pnlStatement.grossProfit)} ({((pnlStatement.grossProfit / pnlStatement.netOperatingRevenue) * 100).toFixed(1)}%)
                  </span>
                </div>

                <div className="space-y-1 pt-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Operating Overhead Expenses</div>
                  {pnlStatement.overheadLines.map((line) => (
                    <div key={line.label} className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>{line.label}</span>
                      <span>{formatINR(line.amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 rounded-2xl font-black text-sm shadow-lg mt-4">
                  <span>FINAL NET OPERATING PROFIT</span>
                  <span className="text-base">{formatINR(pnlStatement.finalNetOperatingProfit)}</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-purple-600" />
                  <span>GST Tax Slab Summary (GSTR-1 &amp; 3B Prep)</span>
                </h3>
              </div>

              <DataTable columns={gstColumns} data={gstTaxSlabSummary} pageSize={10} />

              <div className="flex items-center justify-between py-3 px-4 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 font-black text-xs">
                <span>TOTAL GST</span>
                <div className="flex items-center gap-4">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">CGST {formatINR(gstTaxSlabSummary.reduce((s, g) => s + g.cgst, 0))}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">SGST {formatINR(gstTaxSlabSummary.reduce((s, g) => s + g.sgst, 0))}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatINR(gstTotal)}</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* MODAL: PRODUCT DRILLDOWN */}
      <Modal open={productModalOpen} onClose={() => setProductModalOpen(false)} maxWidth="xl">
        {selectedProductRow && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">{selectedProductRow.name}</h3>
                  <p className="text-[11px] text-slate-400">{selectedProductRow.sku}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Units Sold</div>
                <div className="text-base font-black text-blue-600 dark:text-blue-400">{selectedProductRow.unitsSold.toLocaleString('en-IN')}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Revenue</div>
                <div className="text-base font-black text-slate-900 dark:text-white">{formatINR(selectedProductRow.revenue)}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Gross Margin</div>
                <div className="text-base font-black text-emerald-500">{selectedProductRow.marginPercent}%</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Category:</span>
                <strong>{selectedProductRow.categoryName}</strong>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Current Stock:</span>
                <strong>{selectedProductRow.stockQty} units</strong>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Tax Rate (GST):</span>
                <strong>{selectedProductRow.gstRate}% GST</strong>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Primary Selling Branch:</span>
                <strong>Downtown Flagship</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setProductModalOpen(false)}>
                Close
              </Button>
              <Button variant="primary" onClick={handleCreateSupplierPo}>
                Create Supplier PO
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: EXPORT REPORT */}
      <Modal open={exportModalOpen} onClose={() => setExportModalOpen(false)} title="Export Analytics Report" maxWidth="md">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Export Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setExportFormat('pdf')}
                className={cn(
                  'p-3 rounded-2xl border-2 font-bold flex items-center gap-2 justify-center transition',
                  exportFormat === 'pdf'
                    ? 'border-blue-600 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                )}
              >
                <FileText className="w-4 h-4" /> PDF Document
              </button>
              <button
                onClick={() => setExportFormat('excel')}
                className={cn(
                  'p-3 rounded-2xl border-2 font-bold flex items-center gap-2 justify-center transition',
                  exportFormat === 'excel'
                    ? 'border-blue-600 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                )}
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel (XLSX)
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Include Modules</label>
            <div className="space-y-1.5">
              <Checkbox
                label="Executive KPI Summary & Revenue Curves"
                checked={exportModules.kpi}
                onChange={(e) => setExportModules((prev) => ({ ...prev, kpi: e.target.checked }))}
              />
              <Checkbox
                label="Top Selling SKU Profitability Table"
                checked={exportModules.topSku}
                onChange={(e) => setExportModules((prev) => ({ ...prev, topSku: e.target.checked }))}
              />
              <Checkbox
                label="GSTR-1 Tax Slabs & P&L Statement"
                checked={exportModules.gst}
                onChange={(e) => setExportModules((prev) => ({ ...prev, gst: e.target.checked }))}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setExportModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleDownloadReport}>
            Download File
          </Button>
        </div>
      </Modal>

      {/* MODAL: SCHEDULE EMAIL REPORT */}
      <Modal open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title="Schedule Automated Email Report" maxWidth="md">
        <div className="space-y-3">
          <Input
            label="Recipient Email Address"
            type="email"
            value={scheduleEmail}
            onChange={(e) => setScheduleEmail(e.target.value)}
          />
          <Select
            label="Send Frequency"
            value={scheduleFrequency}
            onChange={(e) => setScheduleFrequency(e.target.value)}
            options={[
              { value: 'Daily at 8:00 AM (Morning Recap)', label: 'Daily at 8:00 AM (Morning Recap)' },
              { value: 'Weekly every Monday morning', label: 'Weekly every Monday morning' },
              { value: 'Monthly on 1st day at midnight', label: 'Monthly on 1st day at midnight' },
            ]}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setScheduleModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleScheduleSave}
            className="!bg-amber-500 hover:!bg-amber-600 !from-amber-500 !to-amber-500 hover:!from-amber-600 hover:!to-amber-600 shadow-amber-500/20"
          >
            Enable Auto-Mail
          </Button>
        </div>
      </Modal>
    </>
  );
}
