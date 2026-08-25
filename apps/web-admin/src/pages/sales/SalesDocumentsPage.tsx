import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, X, FileText, Truck, ReceiptText, FileMinus, CheckCircle2, Send, XCircle, ArrowRightCircle, PackageCheck } from 'lucide-react';
import { Badge, Button, DataTable, Drawer, GlassCard, Input, KpiCard, PillTabs, Select, useToast } from '@pospe/ui-library';
import { listProducts, type LiveProduct } from '../../services/api/products';
import { listCustomers, type LiveCustomer } from '../../services/api/customers';
import { listInvoices, type LiveInvoice } from '../../services/api/salesInvoices';
import {
  listQuotes, createQuote, sendQuote, acceptQuote, rejectQuote, convertQuote, deleteQuote,
  listChallans, createChallan, dispatchChallan, deliverChallan, cancelChallan,
  listCreditNotes, createCreditNote, cancelCreditNote,
  listDebitNotes, createDebitNote, cancelDebitNote,
  type LiveQuote, type QuoteKind, type LiveChallan, type LiveCreditNote, type LiveDebitNote, type DocLineItem,
} from '../../services/api/salesDocuments';
import { formatDateTime, formatINR } from '../../utils/format';

const tabs = [
  { value: 'quotes', label: 'Quotations & Estimates' },
  { value: 'challans', label: 'Delivery Challans' },
  { value: 'credit', label: 'Credit Notes' },
  { value: 'debit', label: 'Debit Notes' },
];

// Shared by every drawer here — a product + qty picker, price always derived
// server-side so a tampered request can't under-charge the same way checkout
// already guards against that.
function LineItemsEditor({
  items,
  products,
  onChange,
}: {
  items: DocLineItem[];
  products: LiveProduct[];
  onChange: (items: DocLineItem[]) => void;
}) {
  const productOptions = useMemo(() => products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })), [products]);
  const update = (idx: number, patch: Partial<DocLineItem>) => onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const add = () => onChange([...items, { productId: products[0]?.id ?? '', quantity: 1 }]);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Line Items *</p>
      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="col-span-8">
            <Select label={idx === 0 ? 'Product' : undefined} options={productOptions} value={item.productId} onChange={(e) => update(idx, { productId: e.target.value })} />
          </div>
          <div className="col-span-3">
            <Input label={idx === 0 ? 'Qty' : undefined} type="number" min={1} value={item.quantity} onChange={(e) => update(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })} />
          </div>
          <div className="col-span-1 flex justify-center pb-2">
            <button type="button" onClick={() => remove(idx)} disabled={items.length === 1} className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 disabled:opacity-30 hover:bg-rose-600 hover:text-white transition">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={add}>
        <Plus className="w-3.5 h-3.5" /> Add Line Item
      </Button>
    </div>
  );
}

const quoteStatusColor: Record<string, 'slate' | 'blue' | 'emerald' | 'red' | 'amber' | 'purple'> = {
  DRAFT: 'slate', SENT: 'blue', ACCEPTED: 'emerald', REJECTED: 'red', EXPIRED: 'amber', CONVERTED: 'purple',
};
const challanStatusColor: Record<string, 'slate' | 'blue' | 'emerald' | 'red'> = {
  DRAFT: 'slate', DISPATCHED: 'blue', DELIVERED: 'emerald', CANCELLED: 'red',
};

export default function SalesDocumentsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState('quotes');

  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [customers, setCustomers] = useState<LiveCustomer[]>([]);
  const [invoices, setInvoices] = useState<LiveInvoice[]>([]);

  const [quotes, setQuotes] = useState<LiveQuote[]>([]);
  const [challans, setChallans] = useState<LiveChallan[]>([]);
  const [creditNotes, setCreditNotes] = useState<LiveCreditNote[]>([]);
  const [debitNotes, setDebitNotes] = useState<LiveDebitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [drawer, setDrawer] = useState<null | 'quote' | 'challan' | 'credit' | 'debit'>(null);
  const [quoteForm, setQuoteForm] = useState<{ kind: QuoteKind; customerId: string; items: DocLineItem[]; validUntil: string; notes: string }>({
    kind: 'QUOTATION', customerId: '', items: [{ productId: '', quantity: 1 }], validUntil: '', notes: '',
  });
  const [challanForm, setChallanForm] = useState<{ customerId: string; items: DocLineItem[]; vehicleNumber: string; transporterName: string; notes: string }>({
    customerId: '', items: [{ productId: '', quantity: 1 }], vehicleNumber: '', transporterName: '', notes: '',
  });
  const [creditForm, setCreditForm] = useState<{ invoiceId: string; items: DocLineItem[]; reason: string }>({
    invoiceId: '', items: [{ productId: '', quantity: 1 }], reason: '',
  });
  const [debitForm, setDebitForm] = useState<{ invoiceId: string; reason: string; amount: string }>({
    invoiceId: '', reason: '', amount: '',
  });

  async function reload() {
    setLoading(true);
    try {
      const [p, c, inv, q, ch, cn, dn] = await Promise.all([
        listProducts(), listCustomers(), listInvoices(), listQuotes(), listChallans(), listCreditNotes(), listDebitNotes(),
      ]);
      setProducts(p);
      setCustomers(c);
      setInvoices(inv);
      setQuotes(q);
      setChallans(ch);
      setCreditNotes(cn);
      setDebitNotes(dn);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load sales documents from the server', 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productOptions = useMemo(() => products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })), [products]);
  const customerOptions = useMemo(() => [{ value: '', label: 'Walk-in Customer' }, ...customers.map((c) => ({ value: c.id, label: c.name }))], [customers]);
  const invoiceOptions = useMemo(() => invoices.map((i) => ({ value: i.id, label: `${i.invoiceNumber ?? i.id} — ${formatINR(i.total)}` })), [invoices]);

  function openQuoteDrawer() {
    setQuoteForm({ kind: 'QUOTATION', customerId: '', items: [{ productId: products[0]?.id ?? '', quantity: 1 }], validUntil: '', notes: '' });
    setDrawer('quote');
  }
  function openChallanDrawer() {
    setChallanForm({ customerId: '', items: [{ productId: products[0]?.id ?? '', quantity: 1 }], vehicleNumber: '', transporterName: '', notes: '' });
    setDrawer('challan');
  }
  function openCreditDrawer() {
    setCreditForm({ invoiceId: invoiceOptions[0]?.value ?? '', items: [{ productId: products[0]?.id ?? '', quantity: 1 }], reason: '' });
    setDrawer('credit');
  }
  function openDebitDrawer() {
    setDebitForm({ invoiceId: invoiceOptions[0]?.value ?? '', reason: '', amount: '' });
    setDrawer('debit');
  }

  async function handleSaveQuote(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createQuote({
        kind: quoteForm.kind,
        customerId: quoteForm.customerId || undefined,
        items: quoteForm.items,
        validUntil: quoteForm.validUntil || undefined,
        notes: quoteForm.notes || undefined,
      });
      await reload();
      setDrawer(null);
      showToast(`${quoteForm.kind === 'ESTIMATE' ? 'Estimate' : 'Quotation'} created`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create document', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveChallan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createChallan({
        customerId: challanForm.customerId || undefined,
        items: challanForm.items,
        vehicleNumber: challanForm.vehicleNumber || undefined,
        transporterName: challanForm.transporterName || undefined,
        notes: challanForm.notes || undefined,
      });
      await reload();
      setDrawer(null);
      showToast('Delivery challan created', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create delivery challan', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCredit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createCreditNote({ invoiceId: creditForm.invoiceId, items: creditForm.items, reason: creditForm.reason });
      await reload();
      setDrawer(null);
      showToast('Credit note issued', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not issue credit note', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDebit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createDebitNote({ invoiceId: debitForm.invoiceId, reason: debitForm.reason, amount: Number(debitForm.amount) || 0 });
      await reload();
      setDrawer(null);
      showToast('Debit note issued', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not issue debit note', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function runAction(label: string, action: () => Promise<unknown>) {
    try {
      await action();
      await reload();
      showToast(label, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'danger');
    }
  }

  const quoteColumns: ColumnDef<LiveQuote, any>[] = [
    { header: 'Number', accessorKey: 'quoteNumber', cell: ({ row }) => (
      <div>
        <p className="font-bold text-slate-800 dark:text-slate-100">{row.original.quoteNumber}</p>
        <p className="text-[10px] text-slate-400">{row.original.kind === 'ESTIMATE' ? 'Estimate' : 'Quotation'}</p>
      </div>
    ) },
    { header: 'Customer', accessorKey: 'customerName' },
    { header: 'Total', accessorKey: 'total', cell: ({ getValue }) => <span className="font-bold">{formatINR(getValue() as number)}</span> },
    { header: 'Status', accessorKey: 'status', cell: ({ getValue }) => {
      const s = getValue() as string;
      return <Badge color={quoteStatusColor[s]} dot pill>{s}</Badge>;
    } },
    { header: 'Created', accessorKey: 'createdAt', cell: ({ getValue }) => <span className="text-slate-500 dark:text-slate-400">{formatDateTime(getValue() as string)}</span> },
    { header: 'Actions', id: 'actions', cell: ({ row }) => {
      const q = row.original;
      return (
        <div className="flex items-center gap-1.5">
          {q.status === 'DRAFT' && (
            <button onClick={() => runAction('Sent to customer', () => sendQuote(q.id))} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" title="Send">
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
          {q.status === 'SENT' && (
            <>
              <button onClick={() => runAction('Marked accepted', () => acceptQuote(q.id))} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" title="Accept">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => runAction('Marked rejected', () => rejectQuote(q.id))} className="p-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20" title="Reject">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {q.status === 'ACCEPTED' && (
            <button onClick={() => runAction('Converted to invoice', () => convertQuote(q.id))} className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20" title="Convert to invoice">
              <ArrowRightCircle className="w-3.5 h-3.5" />
            </button>
          )}
          {q.status === 'DRAFT' && (
            <button onClick={() => runAction('Deleted', () => deleteQuote(q.id))} className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-rose-600 hover:text-white" title="Delete">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {q.status === 'CONVERTED' && <span className="text-[10px] text-slate-400">Invoiced</span>}
        </div>
      );
    } },
  ];

  const challanColumns: ColumnDef<LiveChallan, any>[] = [
    { header: 'Number', accessorKey: 'challanNumber' },
    { header: 'Customer', accessorKey: 'customerName' },
    { header: 'Transport', id: 'transport', cell: ({ row }) => (
      <div>
        <p className="text-slate-700 dark:text-slate-300">{row.original.vehicleNumber ?? '—'}</p>
        <p className="text-[10px] text-slate-400">{row.original.transporterName ?? ''}</p>
      </div>
    ) },
    { header: 'Items', id: 'items', cell: ({ row }) => <span className="text-[11px] text-slate-500">{row.original.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}</span> },
    { header: 'Status', accessorKey: 'status', cell: ({ getValue }) => {
      const s = getValue() as string;
      return <Badge color={challanStatusColor[s]} dot pill>{s}</Badge>;
    } },
    { header: 'Actions', id: 'actions', cell: ({ row }) => {
      const c = row.original;
      return (
        <div className="flex items-center gap-1.5">
          {c.status === 'DRAFT' && (
            <button onClick={() => runAction('Dispatched', () => dispatchChallan(c.id))} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" title="Dispatch">
              <Truck className="w-3.5 h-3.5" />
            </button>
          )}
          {c.status === 'DISPATCHED' && (
            <button onClick={() => runAction('Marked delivered', () => deliverChallan(c.id))} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" title="Mark delivered">
              <PackageCheck className="w-3.5 h-3.5" />
            </button>
          )}
          {(c.status === 'DRAFT' || c.status === 'DISPATCHED') && (
            <button onClick={() => runAction('Cancelled', () => cancelChallan(c.id))} className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-rose-600 hover:text-white" title="Cancel">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      );
    } },
  ];

  const creditColumns: ColumnDef<LiveCreditNote, any>[] = [
    { header: 'Number', accessorKey: 'creditNoteNumber' },
    { header: 'Against Invoice', accessorKey: 'invoiceNumber', cell: ({ getValue }) => <span className="font-mono text-[11px]">{(getValue() as string) ?? '—'}</span> },
    { header: 'Customer', accessorKey: 'customerName' },
    { header: 'Reason', accessorKey: 'reason', cell: ({ getValue }) => <span className="text-slate-600 dark:text-slate-300">{getValue() as string}</span> },
    { header: 'Amount', accessorKey: 'total', cell: ({ getValue }) => <span className="font-bold text-rose-600 dark:text-rose-400">-{formatINR(getValue() as number)}</span> },
    { header: 'Status', accessorKey: 'status', cell: ({ getValue }) => <Badge color={getValue() === 'ISSUED' ? 'emerald' : 'slate'} dot pill>{getValue() as string}</Badge> },
    { header: 'Actions', id: 'actions', cell: ({ row }) =>
      row.original.status === 'ISSUED' ? (
        <button onClick={() => runAction('Credit note cancelled', () => cancelCreditNote(row.original.id))} className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-rose-600 hover:text-white" title="Cancel">
          <X className="w-3.5 h-3.5" />
        </button>
      ) : <span className="text-[10px] text-slate-400">&mdash;</span>,
    },
  ];

  const debitColumns: ColumnDef<LiveDebitNote, any>[] = [
    { header: 'Number', accessorKey: 'debitNoteNumber' },
    { header: 'Against Invoice', accessorKey: 'invoiceNumber', cell: ({ getValue }) => <span className="font-mono text-[11px]">{(getValue() as string) ?? '—'}</span> },
    { header: 'Customer', accessorKey: 'customerName' },
    { header: 'Reason', accessorKey: 'reason', cell: ({ getValue }) => <span className="text-slate-600 dark:text-slate-300">{getValue() as string}</span> },
    { header: 'Amount', accessorKey: 'amount', cell: ({ getValue }) => <span className="font-bold text-amber-600 dark:text-amber-400">+{formatINR(getValue() as number)}</span> },
    { header: 'Status', accessorKey: 'status', cell: ({ getValue }) => <Badge color={getValue() === 'ISSUED' ? 'emerald' : 'slate'} dot pill>{getValue() as string}</Badge> },
    { header: 'Actions', id: 'actions', cell: ({ row }) =>
      row.original.status === 'ISSUED' ? (
        <button onClick={() => runAction('Debit note cancelled', () => cancelDebitNote(row.original.id))} className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-rose-600 hover:text-white" title="Cancel">
          <X className="w-3.5 h-3.5" />
        </button>
      ) : <span className="text-[10px] text-slate-400">&mdash;</span>,
    },
  ];

  const openQuotesCount = quotes.filter((q) => q.status === 'SENT' || q.status === 'DRAFT').length;
  const convertedCount = quotes.filter((q) => q.status === 'CONVERTED').length;
  const inTransitCount = challans.filter((c) => c.status === 'DISPATCHED').length;

  return (
    <div className="space-y-8">
      <GlassCard className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Sales Documents</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Quotations, estimates, delivery challans, and credit/debit notes — the paper trail around a sale, before and after the invoice.
          </p>
        </div>
        <PillTabs options={tabs} value={tab} onChange={setTab} />
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard icon={FileText} label="Open Quotes & Estimates" value={`${openQuotesCount}`} delta="Awaiting response" deltaTone="neutral" color="blue" />
        <KpiCard icon={ArrowRightCircle} label="Converted to Invoice" value={`${convertedCount}`} delta="This period" deltaTone="positive" color="purple" />
        <KpiCard icon={Truck} label="Challans In Transit" value={`${inTransitCount}`} delta="Dispatched, not yet delivered" deltaTone="neutral" color="amber" />
      </div>

      {tab === 'quotes' && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Quotations & Estimates</h2>
            <button onClick={openQuoteDrawer} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25">
              <Plus className="w-4 h-4" /> New Quote / Estimate
            </button>
          </div>
          <DataTable columns={quoteColumns} data={quotes} loading={loading} emptyTitle="No quotations yet" emptyDescription="Create a price quote or estimate for a prospective sale." pageSize={8} />
        </GlassCard>
      )}

      {tab === 'challans' && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Delivery Challans</h2>
            <button onClick={openChallanDrawer} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-xs font-bold shadow-lg shadow-teal-500/25">
              <Plus className="w-4 h-4" /> New Delivery Challan
            </button>
          </div>
          <DataTable columns={challanColumns} data={challans} loading={loading} emptyTitle="No delivery challans yet" emptyDescription="Create one to dispatch goods ahead of a formal invoice." pageSize={8} />
        </GlassCard>
      )}

      {tab === 'credit' && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Credit Notes</h2>
            <button onClick={openCreditDrawer} disabled={!invoiceOptions.length} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-bold shadow-lg shadow-rose-500/25 disabled:opacity-40">
              <Plus className="w-4 h-4" /> New Credit Note
            </button>
          </div>
          <DataTable columns={creditColumns} data={creditNotes} loading={loading} emptyTitle="No credit notes yet" emptyDescription="Issue one against an invoice for a partial return or price adjustment." pageSize={8} />
        </GlassCard>
      )}

      {tab === 'debit' && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Debit Notes</h2>
            <button onClick={openDebitDrawer} disabled={!invoiceOptions.length} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-bold shadow-lg shadow-amber-500/25 disabled:opacity-40">
              <Plus className="w-4 h-4" /> New Debit Note
            </button>
          </div>
          <DataTable columns={debitColumns} data={debitNotes} loading={loading} emptyTitle="No debit notes yet" emptyDescription="Issue one against an invoice for an additional charge billed after the sale." pageSize={8} />
        </GlassCard>
      )}

      {/* Quote / Estimate drawer */}
      <Drawer
        open={drawer === 'quote'}
        onClose={() => setDrawer(null)}
        title="New Quotation / Estimate"
        subtitle="A non-binding price quote — pricing is re-derived from live product prices."
        width="lg"
        footer={
          <>
            <button type="button" onClick={() => setDrawer(null)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">Cancel</button>
            <button form="quote-form" type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 disabled:opacity-50">
              {saving ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        <form id="quote-form" onSubmit={handleSaveQuote} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Document Type" options={[{ value: 'QUOTATION', label: 'Quotation' }, { value: 'ESTIMATE', label: 'Estimate' }]} value={quoteForm.kind} onChange={(e) => setQuoteForm((f) => ({ ...f, kind: e.target.value as QuoteKind }))} />
            <Select label="Customer" options={customerOptions} value={quoteForm.customerId} onChange={(e) => setQuoteForm((f) => ({ ...f, customerId: e.target.value }))} />
          </div>
          <LineItemsEditor items={quoteForm.items} products={products} onChange={(items) => setQuoteForm((f) => ({ ...f, items }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valid Until" type="date" value={quoteForm.validUntil} onChange={(e) => setQuoteForm((f) => ({ ...f, validUntil: e.target.value }))} />
          </div>
          <Input label="Notes" placeholder="Optional notes for this quote" value={quoteForm.notes} onChange={(e) => setQuoteForm((f) => ({ ...f, notes: e.target.value }))} />
        </form>
      </Drawer>

      {/* Delivery challan drawer */}
      <Drawer
        open={drawer === 'challan'}
        onClose={() => setDrawer(null)}
        title="New Delivery Challan"
        subtitle="Dispatching moves real stock — guarded against overselling the same way checkout is."
        width="lg"
        footer={
          <>
            <button type="button" onClick={() => setDrawer(null)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">Cancel</button>
            <button form="challan-form" type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-lg shadow-teal-500/25 disabled:opacity-50">
              {saving ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        <form id="challan-form" onSubmit={handleSaveChallan} className="space-y-4">
          <Select label="Customer" options={customerOptions} value={challanForm.customerId} onChange={(e) => setChallanForm((f) => ({ ...f, customerId: e.target.value }))} />
          <LineItemsEditor items={challanForm.items} products={products} onChange={(items) => setChallanForm((f) => ({ ...f, items }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vehicle Number" placeholder="MH-04-AB-1234" value={challanForm.vehicleNumber} onChange={(e) => setChallanForm((f) => ({ ...f, vehicleNumber: e.target.value }))} />
            <Input label="Transporter" placeholder="Carrier / fleet name" value={challanForm.transporterName} onChange={(e) => setChallanForm((f) => ({ ...f, transporterName: e.target.value }))} />
          </div>
          <Input label="Notes" placeholder="Optional notes" value={challanForm.notes} onChange={(e) => setChallanForm((f) => ({ ...f, notes: e.target.value }))} />
        </form>
      </Drawer>

      {/* Credit note drawer */}
      <Drawer
        open={drawer === 'credit'}
        onClose={() => setDrawer(null)}
        title="New Credit Note"
        subtitle="Restocks exactly the quantities listed — priced off what the original invoice actually charged."
        width="lg"
        footer={
          <>
            <button type="button" onClick={() => setDrawer(null)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">Cancel</button>
            <button form="credit-form" type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-500/25 disabled:opacity-50">
              {saving ? 'Issuing…' : 'Issue Credit Note'}
            </button>
          </>
        }
      >
        <form id="credit-form" onSubmit={handleSaveCredit} className="space-y-4">
          <Select label="Against Invoice" required options={invoiceOptions} value={creditForm.invoiceId} onChange={(e) => setCreditForm((f) => ({ ...f, invoiceId: e.target.value }))} />
          <LineItemsEditor items={creditForm.items} products={products} onChange={(items) => setCreditForm((f) => ({ ...f, items }))} />
          <Input label="Reason" required placeholder="e.g. Customer returned item — quality issue" value={creditForm.reason} onChange={(e) => setCreditForm((f) => ({ ...f, reason: e.target.value }))} />
        </form>
      </Drawer>

      {/* Debit note drawer */}
      <Drawer
        open={drawer === 'debit'}
        onClose={() => setDrawer(null)}
        title="New Debit Note"
        subtitle="Records an additional charge billed after the original invoice — no stock movement."
        footer={
          <>
            <button type="button" onClick={() => setDrawer(null)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">Cancel</button>
            <button form="debit-form" type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-500/25 disabled:opacity-50">
              {saving ? 'Issuing…' : 'Issue Debit Note'}
            </button>
          </>
        }
      >
        <form id="debit-form" onSubmit={handleSaveDebit} className="space-y-4">
          <Select label="Against Invoice" required options={invoiceOptions} value={debitForm.invoiceId} onChange={(e) => setDebitForm((f) => ({ ...f, invoiceId: e.target.value }))} />
          <Input label="Amount" required type="number" min={1} step="0.01" value={debitForm.amount} onChange={(e) => setDebitForm((f) => ({ ...f, amount: e.target.value }))} />
          <Input label="Reason" required placeholder="e.g. Additional freight charge" value={debitForm.reason} onChange={(e) => setDebitForm((f) => ({ ...f, reason: e.target.value }))} />
        </form>
      </Drawer>
    </div>
  );
}
