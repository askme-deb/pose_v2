import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Search, Download, Sliders, ClipboardList, TrendingDown, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { Badge, Drawer, DataTable, GlassCard, Input, KpiCard, Select, useToast } from '@pospe/ui-library';
import { listProducts, LiveProduct } from '../../services/api/products';
import {
  listStockAdjustments,
  createStockAdjustment,
  approveStockAdjustment,
  LiveStockAdjustment,
  AdjustmentAction,
} from '../../services/api/stockAdjustments';
import { formatDateTime, formatINR } from '../../utils/format';
import { downloadCSV } from '../../utils/csv';

const actionOptions = [
  { value: 'SUBTRACT', label: 'Subtract Stock (-)' },
  { value: 'ADD', label: 'Add Stock (+)' },
];

const reasonCodeOptions = [
  { value: 'Expired / Damaged', label: 'Expired / Damaged' },
  { value: 'Audit Variance Correction', label: 'Audit Variance Correction' },
  { value: 'Store Consumption / Tasting', label: 'Store Consumption / Tasting' },
  { value: 'Shrinkage / Missing', label: 'Shrinkage / Missing' },
];

const reasonFilterOptions = [{ value: 'all', label: 'All Adjustment Reasons' }, ...reasonCodeOptions];

const emptyForm = {
  productId: '',
  action: 'SUBTRACT' as AdjustmentAction,
  qty: '1',
  reasonCode: reasonCodeOptions[0]?.value ?? '',
  auditor: 'Manager Alex',
};

export default function StockAdjustmentsPage() {
  const { showToast } = useToast();
  const [adjustments, setAdjustments] = useState<LiveStockAdjustment[]>([]);
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const productOptions = useMemo(() => products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })), [products]);

  async function reload() {
    setLoading(true);
    try {
      const [rows, prods] = await Promise.all([listStockAdjustments(), listProducts()]);
      setAdjustments(rows);
      setProducts(prods);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load stock adjustments from the server', 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalAdjustments = adjustments.length;
  const netQtyVariance = adjustments.reduce((sum, a) => sum + (a.action === 'ADD' ? a.qty : -a.qty), 0);
  const netValuationImpact = adjustments.reduce((sum, a) => sum + a.valueImpact, 0);
  const pendingCount = adjustments.filter((a) => a.status === 'PENDING').length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return adjustments.filter((a) => {
      const matchesSearch =
        !q || a.id.toLowerCase().includes(q) || a.productName.toLowerCase().includes(q) || a.productSku.toLowerCase().includes(q);
      const matchesReason = reasonFilter === 'all' || a.reasonCode === reasonFilter;
      return matchesSearch && matchesReason;
    });
  }, [adjustments, search, reasonFilter]);

  function openDrawer() {
    setForm({ ...emptyForm, productId: productOptions[0]?.value ?? '' });
    setDrawerOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createStockAdjustment({
        productId: form.productId,
        action: form.action,
        qty: Number(form.qty) || 0,
        reasonCode: form.reasonCode,
        auditor: form.auditor.trim() || 'Manager Alex',
      });
      await reload();
      setDrawerOpen(false);
      showToast('Adjustment logged', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not log adjustment', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      await approveStockAdjustment(id);
      setAdjustments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'APPROVED' } : a)));
      showToast('Adjustment approved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not approve adjustment', 'danger');
    }
  }

  function handleExportCSV() {
    downloadCSV(
      'stock-adjustments-log.csv',
      ['Ref ID', 'Date', 'Product', 'SKU', 'Action', 'Qty', 'Reason', 'Auditor', 'Value Impact', 'Status'],
      filtered.map((a) => [
        a.id,
        formatDateTime(a.createdAt),
        a.productName,
        a.productSku,
        a.action,
        a.qty,
        a.reasonCode,
        a.auditor,
        a.valueImpact,
        a.status,
      ]),
    );
    showToast('Stock adjustment log exported', 'success');
  }

  const columns: ColumnDef<LiveStockAdjustment, any>[] = [
    {
      header: 'Date',
      accessorKey: 'createdAt',
      cell: ({ getValue }) => <span className="text-slate-500 dark:text-slate-400">{formatDateTime(getValue() as string)}</span>,
    },
    {
      header: 'Product',
      id: 'product',
      cell: ({ row }) => (
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-100">{row.original.productName}</p>
          <p className="text-[10px] font-mono text-slate-400">{row.original.productSku}</p>
        </div>
      ),
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: ({ getValue }) => {
        const action = getValue() as AdjustmentAction;
        return (
          <Badge color={action === 'ADD' ? 'emerald' : 'red'} pill>
            {action === 'ADD' ? 'Add (+)' : 'Subtract (-)'}
          </Badge>
        );
      },
    },
    { header: 'Qty', accessorKey: 'qty' },
    { header: 'Reason', accessorKey: 'reasonCode', cell: ({ getValue }) => <span className="text-slate-600 dark:text-slate-300">{getValue() as string}</span> },
    { header: 'Auditor', accessorKey: 'auditor' },
    {
      header: 'Value Impact',
      accessorKey: 'valueImpact',
      cell: ({ getValue }) => {
        const v = getValue() as number;
        return <span className={`font-bold ${v < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatINR(v)}</span>;
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => {
        const status = getValue() as LiveStockAdjustment['status'];
        return (
          <Badge color={status === 'APPROVED' ? 'emerald' : 'amber'} dot pill>
            {status === 'APPROVED' ? 'Approved' : 'Pending'}
          </Badge>
        );
      },
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) =>
        row.original.status === 'PENDING' ? (
          <button
            onClick={() => handleApprove(row.original.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition"
          >
            <CheckCircle2 className="w-3 h-3" /> Approve
          </button>
        ) : (
          <span className="text-[10px] text-slate-400">&mdash;</span>
        ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <GlassCard className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Stock Adjustment & Audit Logs
            </h1>
            <Badge color="red" dot pill>
              {totalAdjustments} Audit Logs &bull; {pendingCount} Pending
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Reconcile inventory variances, log stock shrinkage, damage, and audit corrections. Adjustments apply to
            live stock immediately; approval is the manager sign-off.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search REF ID, SKU, product..."
              className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500 w-64 shadow-inner"
            />
          </div>

          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
          >
            {reasonFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-rose-500 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-rose-500" />
            <span>Export Log</span>
          </button>
          <button
            onClick={openDrawer}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition transform hover:scale-[1.02]"
          >
            <Sliders className="w-4 h-4" />
            <span>+ New Adjustment</span>
          </button>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={ClipboardList} label="Total Adjustments" value={`${totalAdjustments} Logged`} delta="Audit history" deltaTone="neutral" color="red" />
        <KpiCard
          icon={TrendingDown}
          label="Net Quantity Variance"
          value={`${netQtyVariance > 0 ? '+' : ''}${netQtyVariance} Units`}
          delta={netQtyVariance < 0 ? 'Shrinkage & Damage' : 'Net Stock Gain'}
          deltaTone={netQtyVariance < 0 ? 'negative' : 'positive'}
          color="amber"
        />
        <KpiCard
          icon={DollarSign}
          label="Net Valuation Impact"
          value={formatINR(netValuationImpact)}
          delta={netValuationImpact < 0 ? 'Inventory Loss' : 'Inventory Gain'}
          deltaTone={netValuationImpact < 0 ? 'negative' : 'positive'}
          color="red"
        />
        <KpiCard icon={Clock} label="Pending Audit Review" value={`${pendingCount} Pending`} delta="Requires Manager Signoff" deltaTone="negative" color="amber" />
      </div>

      {/* Audit table */}
      <GlassCard>
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyTitle="No adjustments found"
          emptyDescription="Try adjusting your search or reason filter."
          pageSize={8}
        />
      </GlassCard>

      {/* New Stock Adjustment Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="New Stock Adjustment Log"
        subtitle="Select product SKU and record inventory variance."
        footer={
          <>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              form="adjustment-form"
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-500/25 disabled:opacity-50"
            >
              {saving ? 'Submitting…' : 'Submit Adjustment'}
            </button>
          </>
        }
      >
        <form id="adjustment-form" onSubmit={handleSave} className="space-y-4">
          <Select
            label="Select Target Product SKU"
            required
            options={productOptions}
            value={form.productId}
            onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Adjustment Action"
              required
              options={actionOptions}
              value={form.action}
              onChange={(e) => setForm((f) => ({ ...f, action: e.target.value as AdjustmentAction }))}
            />
            <Input
              label="Quantity Amount"
              required
              type="number"
              min={1}
              value={form.qty}
              onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
            />
          </div>
          <Select
            label="Reason Code"
            required
            options={reasonCodeOptions}
            value={form.reasonCode}
            onChange={(e) => setForm((f) => ({ ...f, reasonCode: e.target.value }))}
          />
          <Input
            label="Auditor / Manager Name"
            placeholder="Your Name"
            value={form.auditor}
            onChange={(e) => setForm((f) => ({ ...f, auditor: e.target.value }))}
          />
        </form>
      </Drawer>
    </div>
  );
}
