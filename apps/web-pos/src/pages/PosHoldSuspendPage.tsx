import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  IndianRupee,
  PauseCircle,
  Clock,
  Timer,
  PlusCircle,
  Zap,
  RotateCcw,
  Trash2,
  ShoppingBag,
  Scissors,
  GitMerge,
} from 'lucide-react';
import { Badge, Button, Drawer, GlassCard, KpiCard, PillTabs, Textarea, EmptyState, useToast, type BadgeColor } from '@pospe/ui-library';
import { useCartStore } from '../store/useCartStore';
import { splitHeldBill, mergeHeldBills, type ApiHeldBill } from '../services/api/billing';
import { formatINR, formatDateTime } from '../utils/format';

const HOLD_CATEGORIES = ['Pending Customer', 'Price Verification', 'Draft Orders'] as const;
type HoldCategory = (typeof HOLD_CATEGORIES)[number];

function deriveHoldCategory(id: string): HoldCategory {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % HOLD_CATEGORIES.length;
  return HOLD_CATEGORIES[hash];
}

const categoryBadgeColor: Record<HoldCategory, BadgeColor> = {
  'Pending Customer': 'blue',
  'Price Verification': 'amber',
  'Draft Orders': 'purple',
};

const categoryShortLabel: Record<HoldCategory, string> = {
  'Pending Customer': 'Customer',
  'Price Verification': 'Pricing',
  'Draft Orders': 'Draft',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
}

function billTotal(bill: ApiHeldBill): number {
  return Number(bill.total);
}

export default function PosHoldSuspendPage() {
  const { heldBills, recallHeldBill, voidHeldBill, holdCurrentBill, loadHeldBills, items } = useCartStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [splitSelected, setSplitSelected] = useState<Set<string>>(new Set());
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadHeldBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalHeldValue = useMemo(() => heldBills.reduce((sum, b) => sum + billTotal(b), 0), [heldBills]);

  const oldest = useMemo(
    () =>
      heldBills.length === 0
        ? null
        : heldBills.reduce((a, b) => (new Date(a.createdAt).getTime() < new Date(b.createdAt).getTime() ? a : b)),
    [heldBills],
  );

  const avgHoldMinutes = useMemo(() => {
    if (heldBills.length === 0) return 0;
    const now = Date.now();
    const totalMins = heldBills.reduce((sum, b) => sum + (now - new Date(b.createdAt).getTime()) / 60000, 0);
    return Math.round(totalMins / heldBills.length);
  }, [heldBills]);

  const filteredBills = useMemo(() => {
    const q = search.trim().toLowerCase();
    return heldBills
      .filter((b) => activeFilter === 'all' || deriveHoldCategory(b.id) === activeFilter)
      .filter(
        (b) =>
          q === '' ||
          (b.label ?? '').toLowerCase().includes(q) ||
          b.customerName.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q),
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [heldBills, activeFilter, search]);

  const selectedBill = heldBills.find((b) => b.id === selectedId) ?? null;
  const mergeCandidates = heldBills.filter((b) => b.id !== selectedId);

  function selectBill(id: string) {
    setSelectedId(id);
    setSplitSelected(new Set());
    setMergeTargetId('');
  }

  async function handleRecall(id: string) {
    setBusy(true);
    try {
      await recallHeldBill(id);
      showToast('Held bill recalled to POS terminal', 'success');
      navigate('/pos');
    } catch {
      showToast('Failed to recall bill — please try again', 'danger');
    } finally {
      setBusy(false);
    }
  }

  async function handleVoid(id: string) {
    setBusy(true);
    try {
      await voidHeldBill(id);
      showToast('Held bill voided', 'info');
      if (selectedId === id) setSelectedId(null);
    } catch {
      showToast('Failed to void bill — please try again', 'danger');
    } finally {
      setBusy(false);
    }
  }

  function toggleSplitItem(itemId: string) {
    setSplitSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  async function handleSplit() {
    if (!selectedBill || splitSelected.size === 0) return;
    setBusy(true);
    try {
      const created = await splitHeldBill(selectedBill.id, [...splitSelected]);
      await loadHeldBills();
      setSplitSelected(new Set());
      setSelectedId(created.id);
      showToast('Bill split into two held bills', 'success');
    } catch {
      showToast('Failed to split bill — please try again', 'danger');
    } finally {
      setBusy(false);
    }
  }

  async function handleMerge() {
    if (!selectedBill || !mergeTargetId) return;
    setBusy(true);
    try {
      const merged = await mergeHeldBills(selectedBill.id, mergeTargetId);
      await loadHeldBills();
      setMergeTargetId('');
      setSelectedId(merged.id);
      showToast('Bills merged', 'success');
    } catch {
      showToast('Failed to merge bills — please try again', 'danger');
    } finally {
      setBusy(false);
    }
  }

  async function handleSuspendSave() {
    const note = noteText.trim();
    if (!note) {
      showToast('Enter a note or reason before suspending', 'warning');
      return;
    }
    if (items.length === 0) {
      showToast('Add items to the active cart before suspending — held bills need at least one item', 'warning');
      return;
    }
    setBusy(true);
    try {
      // No live discount context on this page (it suspends whatever's in the
      // active cart without re-picking a discount), so this holds at 0%.
      await holdCurrentBill(note, 0);
      showToast('Current cart suspended with note', 'success');
      setNoteText('');
      setSuspendOpen(false);
    } catch {
      showToast('Failed to suspend bill — please try again', 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto space-y-6 animate-fade-in pr-1">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Suspended & Held POS Bills</h1>
            <Badge color="amber" pill dot>
              {heldBills.length} Active Suspension{heldBills.length === 1 ? '' : 's'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage, recall, inspect, or void held billing carts from register terminals across all branches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bill #, customer, cashier..."
              className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 w-64 shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSuspendOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-amber-500 transition shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>+ Suspend Note</span>
            </button>
            <button
              onClick={() => navigate('/pos')}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-lg shadow-amber-500/25 transition transform hover:scale-[1.02]"
            >
              <Zap className="w-4 h-4" />
              <span>Open POS Terminal</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={IndianRupee}
          label="Total Held Value"
          value={formatINR(totalHeldValue)}
          delta={`Across ${heldBills.length} cart${heldBills.length === 1 ? '' : 's'}`}
          deltaTone="neutral"
          color="amber"
        />
        <KpiCard
          icon={PauseCircle}
          label="Suspended Bills Queue"
          value={`${heldBills.length} Cart${heldBills.length === 1 ? '' : 's'}`}
          delta="Downtown Flagship"
          deltaTone="neutral"
          color="blue"
        />
        <KpiCard
          icon={Clock}
          label="Oldest Hold Item"
          value={oldest ? timeAgo(oldest.createdAt) : '—'}
          delta={oldest ? `${oldest.id} (${oldest.customerName})` : 'No held bills'}
          deltaTone="negative"
          color="red"
        />
        <KpiCard
          icon={Timer}
          label="Avg Hold Duration"
          value={`${avgHoldMinutes} mins`}
          delta="Quick recovery rate"
          deltaTone="positive"
          color="emerald"
        />
      </div>

      {/* Master-detail split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: filters + list */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          <PillTabs
            options={[
              { value: 'all', label: `All (${heldBills.length})` },
              { value: 'Pending Customer', label: 'Customer' },
              { value: 'Price Verification', label: 'Pricing' },
              { value: 'Draft Orders', label: 'Drafts' },
            ]}
            value={activeFilter}
            onChange={setActiveFilter}
          />

          <div className="space-y-3 overflow-y-auto max-h-[680px] pr-1">
            {filteredBills.length === 0 && (
              <GlassCard padding="sm">
                <EmptyState icon={PauseCircle} title="No held bills" description="Bills held from the POS terminal will appear here." />
              </GlassCard>
            )}
            {filteredBills.map((bill) => {
              const category = deriveHoldCategory(bill.id);
              const active = bill.id === selectedId;
              return (
                <button
                  key={bill.id}
                  onClick={() => selectBill(bill.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition space-y-2 ${
                    active
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-md'
                      : 'glass-card border-slate-200/80 dark:border-slate-800 hover:border-amber-400/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{bill.label ?? 'Held bill'}</p>
                    <Badge color={categoryBadgeColor[category]}>{categoryShortLabel[category]}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {bill.customerName} &middot; {bill.items.length} item{bill.items.length === 1 ? '' : 's'}
                  </p>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{formatDateTime(bill.createdAt)} &middot; {timeAgo(bill.createdAt)}</span>
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400">{formatINR(billTotal(bill))}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: detail inspector */}
        <div className="lg:col-span-7 glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-6">
          {!selectedBill && (
            <EmptyState
              icon={ShoppingBag}
              title="Select a held bill"
              description="Choose a bill from the list to inspect its line items, totals, and recall, void, split, or merge it."
            />
          )}
          {selectedBill && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{selectedBill.label ?? 'Held bill'}</h3>
                    <Badge color={categoryBadgeColor[deriveHoldCategory(selectedBill.id)]}>
                      {categoryShortLabel[deriveHoldCategory(selectedBill.id)]}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    #{selectedBill.id} &middot; Customer: <span className="font-semibold">{selectedBill.customerName}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Held {formatDateTime(selectedBill.createdAt)} ({timeAgo(selectedBill.createdAt)})
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Line Items</p>
                  {selectedBill.items.length > 1 && (
                    <p className="text-[10px] text-slate-400">Check items to split into a new held bill</p>
                  )}
                </div>
                {selectedBill.items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No line items on this bill.</p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {selectedBill.items.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {selectedBill.items.length > 1 && (
                            <input
                              type="checkbox"
                              checked={splitSelected.has(item.id)}
                              onChange={() => toggleSplitItem(item.id)}
                              className="w-3.5 h-3.5 accent-amber-500 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.product.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {formatINR(Number(item.price))} &times; {item.quantity}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono font-black text-slate-900 dark:text-white shrink-0">{formatINR(Number(item.total))}</span>
                      </label>
                    ))}
                  </div>
                )}
                {splitSelected.size > 0 && (
                  <Button variant="secondary" size="sm" className="w-full" disabled={busy} onClick={handleSplit}>
                    <Scissors className="w-3.5 h-3.5" />
                    Split {splitSelected.size} Item{splitSelected.size === 1 ? '' : 's'} Into New Bill
                  </Button>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold">{formatINR(Number(selectedBill.subtotal))}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST Tax:</span>
                  <span className="font-mono font-semibold">{formatINR(Number(selectedBill.taxTotal))}</span>
                </div>
                {Number(selectedBill.heldDiscountPercent ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount ({Number(selectedBill.heldDiscountPercent)}%):</span>
                    <span className="font-mono">
                      -{formatINR(Number(selectedBill.subtotal) * (Number(selectedBill.heldDiscountPercent) / 100))}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
                  <span className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">Total</span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">{formatINR(Number(selectedBill.total))}</span>
                </div>
              </div>

              {mergeCandidates.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={mergeTargetId}
                    onChange={(e) => setMergeTargetId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  >
                    <option value="">Merge into another held bill...</option>
                    {mergeCandidates.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label ?? 'Held bill'} &middot; {b.customerName} &middot; {formatINR(billTotal(b))}
                      </option>
                    ))}
                  </select>
                  <Button variant="secondary" size="sm" disabled={!mergeTargetId || busy} onClick={handleMerge}>
                    <GitMerge className="w-3.5 h-3.5" />
                    Merge
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button variant="primary" className="flex-1" disabled={busy} onClick={() => handleRecall(selectedBill.id)}>
                  <RotateCcw className="w-4 h-4" />
                  Recall to POS
                </Button>
                <Button variant="danger" className="flex-1" disabled={busy} onClick={() => handleVoid(selectedBill.id)}>
                  <Trash2 className="w-4 h-4" />
                  Void Bill
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suspend Note offcanvas */}
      <Drawer
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        title="Suspend Note"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSuspendOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={busy} onClick={handleSuspendSave}>
              Save & Suspend
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {items.length > 0
            ? `This will suspend the ${items.length} item(s) currently in the active cart with your note as the label.`
            : 'The active cart is empty — add items on the POS terminal before suspending a bill.'}
        </p>
        <Textarea
          label="Note / Reason"
          required
          rows={4}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="e.g. Awaiting price verification for SKU AML-CHZ-200..."
        />
      </Drawer>
    </div>
  );
}
