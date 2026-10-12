import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GlassCard, Input, useToast } from '@pospe/ui-library';
import { createPurchaseReturn, getPurchaseOrder, type LivePurchaseOrder } from '../../services/api/purchaseOrders';
import PageShell, { cancelButtonClass } from './PageShell';

const keyOf = (i: { productId: string; optionId: string | null }) => `${i.productId}:${i.optionId ?? ''}`;

/** Return received goods to the supplier (/purchases/orders/:id/return). */
export default function ReturnGoodsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<LivePurchaseOrder | null>(null);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const po = await getPurchaseOrder(id);
        if (!cancelled) setOrder(po);
      } catch (err) {
        if (cancelled) return;
        if (/not found/i.test(String((err as Error)?.message))) setMissing(true);
        else showToast(err instanceof Error ? err.message : 'Could not load the purchase order', 'danger');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const returnable = order?.items.filter((i) => i.receivedQty > 0) ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    const items = returnable
      .map((i) => ({ productId: i.productId, ...(i.optionId ? { optionId: i.optionId } : {}), quantity: qtys[keyOf(i)] ?? 0 }))
      .filter((i) => i.quantity > 0);
    if (items.length === 0) {
      showToast('Enter a return quantity for at least one line item.', 'danger');
      return;
    }
    if (!reason.trim()) {
      showToast('A reason is required for a purchase return.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const ret = await createPurchaseReturn({ purchaseOrderId: order.id, items, reason: reason.trim() });
      showToast(`Recorded ${ret.returnNumber} — stock updated`, 'success');
      navigate('/purchases?tab=returns');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not record purchase return', 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      backTo="/purchases"
      backLabel="Back to Purchase & Suppliers"
      title={`Return Goods${order ? ` — ${order.poNumber}` : ''}`}
      subtitle="Can only return what was actually received on this order."
      footer={
        order && (
          <>
            <Link to="/purchases" className={cancelButtonClass}>
              Cancel
            </Link>
            <button type="submit" form="return-form" disabled={saving || returnable.length === 0} className="px-8 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-500/25 disabled:opacity-50">
              {saving ? 'Recording…' : 'Record Return'}
            </button>
          </>
        )
      }
    >
      {loading ? (
        <GlassCard>
          <p className="text-center text-xs text-slate-400 py-10">Loading…</p>
        </GlassCard>
      ) : missing || !order ? (
        <GlassCard>
          <p className="text-center text-sm font-bold text-slate-600 dark:text-slate-300 py-10">This purchase order no longer exists.</p>
        </GlassCard>
      ) : (
        <form id="return-form" onSubmit={handleSubmit} noValidate>
          <GlassCard className="!p-6 space-y-4">
            {returnable.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">Nothing has been received on this order yet, so there is nothing to return.</p>
            ) : (
              <div className="space-y-2">
                {returnable.map((item) => {
                  const k = keyOf(item);
                  return (
                    <div key={k} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="col-span-7">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.productName}</p>
                        <p className="text-[11px] text-slate-400">{item.receivedQty} received</p>
                      </div>
                      <div className="col-span-5">
                        <Input
                          label="Returning"
                          type="number"
                          min={0}
                          max={item.receivedQty}
                          value={qtys[k] ?? 0}
                          onChange={(e) => setQtys((q) => ({ ...q, [k]: Math.max(0, Math.min(item.receivedQty, Math.floor(Number(e.target.value)) || 0)) }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Input label="Reason" required placeholder="e.g. Arrived damaged" value={reason} onChange={(e) => setReason(e.target.value)} />
          </GlassCard>
        </form>
      )}
    </PageShell>
  );
}
