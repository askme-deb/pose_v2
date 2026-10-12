import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GlassCard, Input, useToast } from '@pospe/ui-library';
import { listProducts, type LiveProduct } from '../../services/api/products';
import { createGrn, getPurchaseOrder, type LivePurchaseOrder, type ReceiveGoodsInput } from '../../services/api/purchaseOrders';
import PageShell, { cancelButtonClass } from './PageShell';

const keyOf = (i: { productId: string; optionId: string | null }) => `${i.productId}:${i.optionId ?? ''}`;
const parseSerials = (text: string) => text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);

/** Record a goods receipt (GRN) against a purchase order (/purchases/orders/:id/receive). */
export default function ReceiveGoodsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<LivePurchaseOrder | null>(null);
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [batches, setBatches] = useState<Record<string, { batchNumber: string; expiryDate: string }>>({});
  const [serials, setSerials] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [po, prods] = await Promise.all([getPurchaseOrder(id), listProducts()]);
        if (cancelled) return;
        setOrder(po);
        setProducts(prods);
        // Defaults to everything still outstanding; edit for a partial shipment.
        setQtys(Object.fromEntries(po.items.map((i) => [keyOf(i), i.qty - i.receivedQty])));
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    const items: ReceiveGoodsInput['items'] = [];
    for (const i of order.items) {
      const k = keyOf(i);
      const receivedQty = qtys[k] ?? 0;
      if (receivedQty <= 0) continue;
      const product = products.find((p) => p.id === i.productId);
      const b = batches[k];
      const batch = product?.trackBatches && b?.batchNumber ? { batchNumber: b.batchNumber, expiryDate: b.expiryDate || undefined } : undefined;
      const serialNumbers = product?.trackSerials ? parseSerials(serials[k] ?? '') : undefined;
      if (product?.trackSerials && serialNumbers && serialNumbers.length !== receivedQty) {
        showToast(`${i.productName}: enter exactly ${receivedQty} serial number(s), got ${serialNumbers.length}.`, 'danger');
        return;
      }
      items.push({ productId: i.productId, ...(i.optionId ? { optionId: i.optionId } : {}), receivedQty, batch, serialNumbers });
    }
    if (items.length === 0) {
      showToast('Enter a received quantity for at least one line item.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const grn = await createGrn({ purchaseOrderId: order.id, items, receivedBy: 'Warehouse Staff' });
      showToast(`Recorded ${grn.grnNumber} — stock updated`, 'success');
      navigate('/purchases?tab=grns');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not record goods receipt', 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      backTo="/purchases"
      backLabel="Back to Purchase & Suppliers"
      title={`Receive Goods${order ? ` — ${order.poNumber}` : ''}`}
      subtitle="Defaults to everything still outstanding — edit to record a partial shipment."
      footer={
        order && (
          <>
            <Link to="/purchases" className={cancelButtonClass}>
              Cancel
            </Link>
            <button type="submit" form="receive-form" disabled={saving} className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 disabled:opacity-50">
              {saving ? 'Recording…' : 'Record Receipt'}
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
        <form id="receive-form" onSubmit={handleSubmit} noValidate>
          <GlassCard className="!p-6 space-y-2">
            <p className="text-xs text-slate-500">
              {order.supplierName} · {order.items.length} line item{order.items.length === 1 ? '' : 's'}
            </p>
            {order.items.map((item) => {
              const k = keyOf(item);
              const remaining = item.qty - item.receivedQty;
              const product = products.find((p) => p.id === item.productId);
              const qtyNow = qtys[k] ?? 0;
              return (
                <div key={k} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-7">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.productName}</p>
                      <p className="text-[11px] text-slate-400">
                        {item.receivedQty} of {item.qty} received &bull; {remaining} outstanding
                      </p>
                    </div>
                    <div className="col-span-5">
                      <Input
                        label="Receiving Now"
                        type="number"
                        min={0}
                        max={remaining}
                        disabled={remaining === 0}
                        value={qtyNow}
                        onChange={(e) => setQtys((q) => ({ ...q, [k]: Math.max(0, Math.min(remaining, Math.floor(Number(e.target.value)) || 0)) }))}
                      />
                    </div>
                  </div>

                  {product?.trackBatches && qtyNow > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                      <Input
                        label="Batch / Lot Number"
                        placeholder="e.g. LOT-2026-08-A"
                        value={batches[k]?.batchNumber ?? ''}
                        onChange={(e) => setBatches((b) => ({ ...b, [k]: { batchNumber: e.target.value, expiryDate: b[k]?.expiryDate ?? '' } }))}
                      />
                      <Input
                        label="Expiry Date"
                        type="date"
                        value={batches[k]?.expiryDate ?? ''}
                        onChange={(e) => setBatches((b) => ({ ...b, [k]: { batchNumber: b[k]?.batchNumber ?? '', expiryDate: e.target.value } }))}
                      />
                    </div>
                  )}

                  {product?.trackSerials && qtyNow > 0 && (
                    <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Serial Numbers ({parseSerials(serials[k] ?? '').length} / {qtyNow})
                      </label>
                      <textarea
                        rows={2}
                        placeholder="One serial per line or comma-separated"
                        value={serials[k] ?? ''}
                        onChange={(e) => setSerials((s) => ({ ...s, [k]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </GlassCard>
        </form>
      )}
    </PageShell>
  );
}
