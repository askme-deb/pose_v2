import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GlassCard, Input, Select, useToast } from '@pospe/ui-library';
import { listProducts, type LiveProduct } from '../../services/api/products';
import { createPurchaseOrder, listSuppliers, type LiveSupplier, type OrderStatus, type PaymentStatus } from '../../services/api/purchaseOrders';
import LineItemsEditor, { newLine, type POLineItem } from './LineItemsEditor';
import PageShell, { cancelButtonClass, primaryButtonClass } from './PageShell';

/** Issue a purchase order (/purchases/orders/new). */
export default function PurchaseOrderFormPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<LiveSupplier[]>([]);
  const [products, setProducts] = useState<LiveProduct[]>([]);

  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<POLineItem[]>([newLine()]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('UNPAID');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('PENDING');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sups, prods] = await Promise.all([listSuppliers(), listProducts()]);
        if (cancelled) return;
        setSuppliers(sups);
        setProducts(prods);
        setSupplierId(sups[0]?.id ?? '');
        setItems([newLine(prods[0])]);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Could not load suppliers and products', 'danger');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) {
      showToast('Select a supplier vendor to issue this PO.', 'danger');
      return;
    }
    const productsById = new Map(products.map((p) => [p.id, p]));
    for (const i of items) {
      const product = productsById.get(i.productId);
      if (!product || i.qty <= 0) {
        showToast('Every line item needs a product and a valid quantity.', 'danger');
        return;
      }
      if (product.options.length && !i.optionId) {
        showToast(`Choose a ${product.variationName.toLowerCase() || 'variation'} for ${product.name}.`, 'danger');
        return;
      }
    }
    const keys = items.map((i) => `${i.productId}:${i.optionId}`);
    if (new Set(keys).size !== keys.length) {
      showToast('The same product (and option) is listed twice — combine the quantities.', 'danger');
      return;
    }

    setSaving(true);
    try {
      const order = await createPurchaseOrder({
        supplierId,
        items: items.map((i) => ({ productId: i.productId, ...(i.optionId ? { optionId: i.optionId } : {}), qty: i.qty, unitPrice: i.unitPrice })),
        expectedDeliveryDate: expectedDeliveryDate || new Date().toISOString().slice(0, 10),
        paymentStatus,
        orderStatus,
      });
      showToast(`Issued purchase order ${order.poNumber} to ${order.supplierName}!`, 'success');
      navigate('/purchases');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not issue purchase order', 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      backTo="/purchases"
      backLabel="Back to Purchase & Suppliers"
      title="Create Purchase Order"
      subtitle="Issue a purchase order to a supplier vendor."
      footer={
        <>
          <Link to="/purchases" className={cancelButtonClass}>
            Cancel
          </Link>
          <button type="submit" form="po-form" disabled={saving || loading} className={primaryButtonClass}>
            {saving ? 'Issuing…' : 'Issue Purchase Order'}
          </button>
        </>
      }
    >
      <form id="po-form" onSubmit={handleSubmit} noValidate>
        <GlassCard className="!p-6 space-y-5">
          {loading ? (
            <p className="text-center text-xs text-slate-400 py-10">Loading…</p>
          ) : (
            <>
              <Select
                label="Select Supplier Vendor"
                required
                options={suppliers.map((s) => ({ value: s.id, label: `${s.companyName}${s.contactPerson ? ` (${s.contactPerson})` : ''}` }))}
                placeholder="Choose a supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              />
              {suppliers.length === 0 && (
                <p className="text-xs text-amber-600">
                  No suppliers yet — <Link to="/purchases/suppliers/new" className="font-bold underline">register one first</Link>.
                </p>
              )}

              <LineItemsEditor items={items} products={products} onChange={setItems} />

              <Input label="Expected Delivery Date" type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Payment Status"
                  options={[
                    { value: 'PAID', label: 'Paid' },
                    { value: 'PARTIAL', label: 'Partial' },
                    { value: 'UNPAID', label: 'Unpaid' },
                  ]}
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                />
                <Select
                  label="Order Status"
                  options={[
                    { value: 'PENDING', label: 'Pending Delivery' },
                    { value: 'RECEIVED', label: 'Received' },
                  ]}
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                />
              </div>
            </>
          )}
        </GlassCard>
      </form>
    </PageShell>
  );
}
