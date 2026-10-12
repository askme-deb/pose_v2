import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, GlassCard, Input, Select, useToast } from '@pospe/ui-library';
import { formatINR, formatDateTime } from '../../utils/format';
import { getSupplierLedger, recordSupplierPayment, type SupplierLedger, type SupplierPaymentMethod } from '../../services/api/purchaseOrders';
import PageShell from './PageShell';

const entryLabel = { PURCHASE_ORDER: 'Purchase Order', PAYMENT: 'Payment Made', RETURN: 'Purchase Return' } as const;
const emptyPayment = { amount: '', method: 'BANK_TRANSFER' as SupplierPaymentMethod, reference: '' };

/** A supplier's balance history, with a payment form (/purchases/suppliers/:id/ledger). */
export default function SupplierLedgerPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [ledger, setLedger] = useState<SupplierLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payment, setPayment] = useState(emptyPayment);

  async function load() {
    try {
      setLedger(await getSupplierLedger(id));
    } catch (err) {
      if (/not found/i.test(String((err as Error)?.message))) setMissing(true);
      else showToast(err instanceof Error ? err.message : 'Could not load vendor ledger', 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(payment.amount);
    if (!amount || amount <= 0) {
      showToast('Enter a valid payment amount.', 'danger');
      return;
    }
    setSaving(true);
    try {
      await recordSupplierPayment(id, { amount, method: payment.method, reference: payment.reference || undefined });
      setPayment(emptyPayment);
      await load();
      showToast('Payment recorded', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not record payment', 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      backTo="/purchases?tab=suppliers"
      backLabel="Back to Purchase & Suppliers"
      title={`Vendor Ledger${ledger ? ` — ${ledger.supplier.name}` : ''}`}
      subtitle="Every purchase order, payment, and return that moved this supplier's balance."
      width="lg"
    >
      {loading ? (
        <GlassCard>
          <p className="text-center text-xs text-slate-400 py-10">Loading ledger…</p>
        </GlassCard>
      ) : missing || !ledger ? (
        <GlassCard>
          <p className="text-center text-sm font-bold text-slate-600 dark:text-slate-300 py-10">This supplier no longer exists.</p>
        </GlassCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem] items-start">
          <GlassCard className="!p-5 space-y-4">
            <div className="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Current Balance Owed</span>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{formatINR(ledger.currentBalance)}</span>
            </div>
            <div className="space-y-1.5">
              {ledger.entries.length === 0 && <p className="text-xs text-slate-400">No transactions yet.</p>}
              {ledger.entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-900 text-xs">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{e.label}</p>
                    <p className="text-[11px] text-slate-400">
                      {entryLabel[e.type]} &bull; {formatDateTime(e.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold ${e.amount < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {e.amount < 0 ? '-' : '+'}
                      {formatINR(Math.abs(e.amount))}
                    </span>
                    <p className="text-[10px] text-slate-400">Balance {formatINR(e.balance)}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="!p-5">
            <form onSubmit={handleRecordPayment} className="space-y-3" noValidate>
              <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Record a Payment</p>
              <Input label="Amount" type="number" min={1} step="0.01" value={payment.amount} onChange={(e) => setPayment((f) => ({ ...f, amount: e.target.value }))} />
              <Select
                label="Method"
                options={[
                  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  { value: 'UPI', label: 'UPI' },
                  { value: 'CHEQUE', label: 'Cheque' },
                  { value: 'CASH', label: 'Cash' },
                ]}
                value={payment.method}
                onChange={(e) => setPayment((f) => ({ ...f, method: e.target.value as SupplierPaymentMethod }))}
              />
              <Input label="Reference (optional)" placeholder="Transaction / cheque no." value={payment.reference} onChange={(e) => setPayment((f) => ({ ...f, reference: e.target.value }))} />
              <Button type="submit" variant="primary" className="w-full" disabled={saving}>
                {saving ? 'Recording…' : 'Record Payment'}
              </Button>
            </form>
          </GlassCard>
        </div>
      )}
    </PageShell>
  );
}
