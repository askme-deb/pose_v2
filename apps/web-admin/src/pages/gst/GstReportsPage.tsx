import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Calculator, Receipt, Percent, CheckCircle2, Search, FileJson, FileCheck2, FileDown, CheckSquare } from 'lucide-react';
import { Badge, Button, DataTable, Drawer, GlassCard, Input, KpiCard, PillTabs, Select, useToast } from '@pospe/ui-library';
import { formatINR } from '../../utils/format';
import {
  GstReturn,
  GstFormType,
  GstFilingStatus,
  gstReturns as initialGstReturns,
  taxSlabs,
  gstFormOptions,
} from '../../services/mockData/gstReturns';

const ITC_CREDIT = 42300;

function periodLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function isoToMonthInput(iso: string): string {
  return iso.slice(0, 7);
}

function monthInputToIso(month: string): string {
  return `${month}-01`;
}

function randomARN(): string {
  return `AA270826${Math.floor(100000 + Math.random() * 900000)}`;
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type FilingFormState = {
  formType: GstFormType;
  period: string;
  billedTurnover: string;
  taxLiability: string;
  arn: string;
};

const emptyForm: FilingFormState = {
  formType: 'GSTR-1',
  period: '2026-08',
  billedTurnover: '',
  taxLiability: '',
  arn: '',
};

export default function GstReportsPage() {
  const { showToast } = useToast();
  const [returns, setReturns] = useState<GstReturn[]>(initialGstReturns);
  const [activeTab, setActiveTab] = useState<'returns' | 'slabs'>('returns');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | GstFilingStatus>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FilingFormState>(emptyForm);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return returns.filter((r) => {
      const matchesSearch =
        !q || periodLabel(r.periodMonth).toLowerCase().includes(q) || r.formType.toLowerCase().includes(q) || r.arn.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [returns, search, statusFilter]);

  const totalTurnover = returns.reduce((s, r) => s + r.billedTurnover, 0);
  const totalOutputTax = returns.reduce((s, r) => s + r.taxLiability, 0);
  const netPayable = Math.max(0, totalOutputTax - ITC_CREDIT);

  function openFileDrawer() {
    setForm(emptyForm);
    setDrawerOpen(true);
  }

  function closeFileDrawer() {
    setDrawerOpen(false);
  }

  function saveFiling() {
    const turnover = parseFloat(form.billedTurnover);
    const taxLiability = parseFloat(form.taxLiability);
    if (!form.period || Number.isNaN(turnover) || Number.isNaN(taxLiability)) {
      showToast('Return period, billed turnover, and tax liability are required', 'danger');
      return;
    }
    const arn = form.arn.trim() || randomARN();
    const newReturn: GstReturn = {
      id: `gst-${Date.now()}`,
      formType: form.formType,
      periodMonth: monthInputToIso(form.period),
      billedTurnover: turnover,
      taxLiability,
      arn,
      status: 'filed',
    };
    setReturns((prev) => [newReturn, ...prev]);
    showToast(`Filed GST Return for ${periodLabel(newReturn.periodMonth)} (ARN: ${arn})!`, 'success');
    closeFileDrawer();
  }

  function filePendingReturn(r: GstReturn) {
    const arn = randomARN();
    setReturns((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'filed', arn } : x)));
    showToast(`Successfully filed GST return for ${periodLabel(r.periodMonth)}!`, 'success');
  }

  function downloadReturnJSON(r: GstReturn) {
    const payload = {
      formType: r.formType,
      period: periodLabel(r.periodMonth),
      billedTurnover: r.billedTurnover,
      cgst: r.taxLiability / 2,
      sgst: r.taxLiability / 2,
      totalTaxLiability: r.taxLiability,
      arn: r.arn || null,
      status: r.status,
    };
    downloadBlob(JSON.stringify(payload, null, 2), `${r.formType}-${isoToMonthInput(r.periodMonth)}.json`, 'application/json');
    showToast(`Downloaded ${r.formType} JSON schema for ${periodLabel(r.periodMonth)}.`, 'info');
  }

  function exportGSTR1JSON() {
    const gstr1Returns = returns.filter((r) => r.formType === 'GSTR-1');
    const payload = {
      gstin: '27AAAAA0000A1Z5',
      exportedAt: new Date().toISOString(),
      returns: gstr1Returns.map((r) => ({
        period: periodLabel(r.periodMonth),
        billedTurnover: r.billedTurnover,
        cgst: r.taxLiability / 2,
        sgst: r.taxLiability / 2,
        totalTaxLiability: r.taxLiability,
        arn: r.arn || null,
        status: r.status,
      })),
    };
    downloadBlob(JSON.stringify(payload, null, 2), `GSTR-1-export-${Date.now()}.json`, 'application/json');
    showToast('Generated official GSTR-1 JSON schema export.', 'success');
  }

  const returnColumns: ColumnDef<GstReturn, any>[] = [
    {
      id: 'period',
      header: 'Tax Period Month',
      accessorFn: (r) => r.periodMonth,
      cell: ({ row }) => <div className="font-bold text-xs text-slate-900 dark:text-white">{periodLabel(row.original.periodMonth)}</div>,
    },
    {
      id: 'formType',
      header: 'GST Return Type',
      accessorFn: (r) => r.formType,
      cell: ({ row }) => (
        <div className="font-semibold text-blue-600 dark:text-blue-400">
          {row.original.formType === 'GSTR-1' ? 'GSTR-1 (Outward Supplies)' : 'GSTR-3B (Summary Return)'}
        </div>
      ),
    },
    {
      id: 'turnover',
      header: 'Billed Turnover',
      accessorFn: (r) => r.billedTurnover,
      cell: ({ row }) => <div className="text-right font-mono font-bold text-slate-900 dark:text-white">{formatINR(row.original.billedTurnover)}</div>,
    },
    {
      id: 'cgst',
      header: 'CGST (9%)',
      accessorFn: (r) => r.taxLiability / 2,
      cell: ({ row }) => <div className="text-right font-mono text-slate-500">{formatINR(row.original.taxLiability / 2)}</div>,
    },
    {
      id: 'sgst',
      header: 'SGST (9%)',
      accessorFn: (r) => r.taxLiability / 2,
      cell: ({ row }) => <div className="text-right font-mono text-slate-500">{formatINR(row.original.taxLiability / 2)}</div>,
    },
    {
      id: 'total',
      header: 'Total GST Output',
      accessorFn: (r) => r.taxLiability,
      cell: ({ row }) => (
        <div className="text-right font-mono font-black text-emerald-600 dark:text-emerald-400">{formatINR(row.original.taxLiability)}</div>
      ),
    },
    {
      id: 'status',
      header: 'Filing Status',
      accessorFn: (r) => r.status,
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.status === 'filed' ? (
            <Badge color="emerald" pill>
              Filed & Verified
            </Badge>
          ) : (
            <Badge color="amber" pill dot>
              Pending
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'arn',
      header: 'Filing Details & ARN',
      accessorFn: (r) => r.arn,
      cell: ({ row }) => (
        <div className="text-[10px] font-mono text-slate-500">
          {row.original.status === 'filed' ? `ARN: ${row.original.arn}` : 'Return not yet filed'}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => downloadReturnJSON(row.original)}
            title="Download JSON"
            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 transition"
          >
            <FileDown className="w-3.5 h-3.5" />
          </button>
          {row.original.status === 'pending' && (
            <button
              onClick={() => filePendingReturn(row.original)}
              title="File Return Now"
              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-600 transition"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const slabColumns: ColumnDef<(typeof taxSlabs)[number], any>[] = [
    { id: 'label', header: 'Tax Slab', accessorFn: (s) => s.label, cell: ({ row }) => <div className="font-bold text-xs text-slate-900 dark:text-white">{row.original.label}</div> },
    { id: 'rate', header: 'Rate', accessorFn: (s) => s.rate, cell: ({ row }) => <div className="font-mono font-bold text-emerald-600">{row.original.rate}%</div> },
    { id: 'itemsCount', header: 'SKU Coverage', accessorFn: (s) => s.itemsCount, cell: ({ row }) => <div className="text-slate-500">{row.original.itemsCount}</div> },
    { id: 'taxableAmount', header: 'Taxable Base', accessorFn: (s) => s.taxableAmount, cell: ({ row }) => <div className="text-right font-mono font-bold text-slate-900 dark:text-white">{formatINR(row.original.taxableAmount)}</div> },
    { id: 'cgst', header: 'CGST', accessorFn: (s) => s.cgst, cell: ({ row }) => <div className="text-right font-mono text-slate-500">{formatINR(row.original.cgst)}</div> },
    { id: 'sgst', header: 'SGST', accessorFn: (s) => s.sgst, cell: ({ row }) => <div className="text-right font-mono text-slate-500">{formatINR(row.original.sgst)}</div> },
    { id: 'total', header: 'Total Tax', accessorFn: (s) => s.total, cell: ({ row }) => <div className="text-right font-mono font-black text-emerald-600 dark:text-emerald-400">{formatINR(row.original.total)}</div> },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              GST Tax Compliance & Return Filing Suite
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> GSTIN: 27AAAAA0000A1Z5 &bull; Q2 FY 2026-27
              Compliant
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate GSTR-1 / GSTR-3B filings, audit CGST/SGST breakdowns, track Input Tax Credit (ITC), and export JSON returns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search GST period, return type..."
              className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 w-64 shadow-inner"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | GstFilingStatus)}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">All Filing Statuses</option>
            <option value="filed">Filed & Verified</option>
            <option value="pending">Filing Pending</option>
          </select>

          <PillTabs
            options={[
              { value: 'returns', label: `GST Returns Ledger (${returns.length})` },
              { value: 'slabs', label: `Tax Slabs Breakdown (${taxSlabs.length})` },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as 'returns' | 'slabs')}
          />

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={exportGSTR1JSON}>
              <FileJson className="w-3.5 h-3.5 text-emerald-600" />
              Export GSTR-1 JSON
            </Button>
            <Button onClick={openFileDrawer}>
              <FileCheck2 className="w-4 h-4" />
              + File GST Return
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Calculator} label="Gross Taxable Turnover" value={formatINR(totalTurnover)} delta="YTD Taxable Outward Billed" deltaTone="positive" color="emerald" />
        <KpiCard icon={Receipt} label="Output GST Liability" value={formatINR(totalOutputTax)} delta={`CGST ${formatINR(totalOutputTax / 2)} + SGST ${formatINR(totalOutputTax / 2)}`} deltaTone="neutral" color="blue" />
        <KpiCard icon={Percent} label="Input Tax Credit (ITC)" value={formatINR(ITC_CREDIT)} delta="Eligible Purchase ITC (GSTR-2B)" deltaTone="neutral" color="purple" />
        <KpiCard icon={CheckCircle2} label="Net Payable GST" value={formatINR(netPayable)} delta="Net Tax Deposited (Challan)" deltaTone="positive" color="emerald" />
      </div>

      {activeTab === 'returns' ? (
        <GlassCard padding="sm" className="!p-0 overflow-hidden">
          <div className="p-4">
            <DataTable
              columns={returnColumns}
              data={filtered}
              emptyTitle="No GST Returns Found"
              emptyDescription="No return period matches your filter criteria."
            />
          </div>
        </GlassCard>
      ) : (
        <GlassCard padding="sm" className="!p-0 overflow-hidden">
          <div className="p-4">
            <DataTable columns={slabColumns} data={taxSlabs} emptyTitle="No Tax Slabs Found" pageSize={taxSlabs.length} />
          </div>
        </GlassCard>
      )}

      <Drawer
        open={drawerOpen}
        onClose={closeFileDrawer}
        title="File GST Tax Return"
        subtitle="Submit GSTR-1 or GSTR-3B tax return to GSTN portal."
        footer={
          <>
            <Button variant="secondary" onClick={closeFileDrawer}>
              Cancel
            </Button>
            <Button onClick={saveFiling}>Confirm GST Return Filing</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="GST Return Form"
            required
            options={gstFormOptions}
            value={form.formType}
            onChange={(e) => setForm((f) => ({ ...f, formType: e.target.value as GstFormType }))}
          />
          <Input
            label="Return Period"
            required
            type="month"
            value={form.period}
            onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Billed Turnover (₹)"
            required
            type="number"
            step="0.01"
            placeholder="e.g. 150000"
            value={form.billedTurnover}
            onChange={(e) => setForm((f) => ({ ...f, billedTurnover: e.target.value }))}
          />
          <Input
            label="Total Tax Liability (₹)"
            required
            type="number"
            step="0.01"
            placeholder="e.g. 18000"
            value={form.taxLiability}
            onChange={(e) => setForm((f) => ({ ...f, taxLiability: e.target.value }))}
          />
        </div>
        <Input
          label="GSTN Acknowledgement Reference (ARN)"
          placeholder="e.g. AA2708261234567"
          value={form.arn}
          onChange={(e) => setForm((f) => ({ ...f, arn: e.target.value }))}
        />
      </Drawer>
    </div>
  );
}
