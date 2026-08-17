import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Scan,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  Clock,
  Printer,
  Banknote,
  QrCode,
  CreditCard,
  SlidersHorizontal,
} from 'lucide-react';
import { Button, Input, Select, Drawer, EmptyState, useToast } from '@pospe/ui-library';
import { useCartStore, cartTotals } from '../store/useCartStore';
import { usePosSessionStore } from '../store/usePosSessionStore';
import { useSyncStatusStore } from '../store/useSyncStatusStore';
import { listProducts, type LiveProduct } from '../services/api/products';
import { listCategories, type LiveCategory } from '../services/api/categories';
import { listCustomers, type LiveCustomer, type CustomerTier } from '../services/api/customers';
import { createInvoice, parseCheckoutError, isNetworkError, type ApiInvoice, type ApiPaymentMethod } from '../services/api/invoices';
import { cacheCatalog, getCachedCatalog, decrementCachedStock, queueSale } from '../offline/posDB';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { formatINR } from '../utils/format';

type PayMethod = 'cash' | 'upi' | 'card' | 'split';

const methodLabels: Record<PayMethod, string> = {
  cash: 'Cash',
  upi: 'UPI / QR',
  card: 'Card',
  split: 'Split Payment',
};

const payMethodToApi: Record<PayMethod, ApiPaymentMethod> = {
  cash: 'CASH',
  upi: 'UPI',
  card: 'CARD',
  split: 'SPLIT',
};

// Real Customer records have no discountPercent field — this is a POS-side
// placeholder tier benefit until a real pricing/promotions module exists.
const TIER_DISCOUNT: Record<CustomerTier, number> = {
  STANDARD: 0,
  SILVER: 5,
  GOLD: 10,
  VIP_DIAMOND: 15,
};

const CATEGORY_EMOJI: [string, string][] = [
  ['dairy', '🥛'], ['milk', '🥛'], ['confection', '🍫'], ['sweet', '🍬'],
  ['gourmet', '🫒'], ['oil', '🫒'], ['beverage', '🥤'], ['drink', '🥤'],
  ['bakery', '🍞'], ['bread', '🍞'], ['nut', '🥜'], ['fresh', '🥚'],
  ['fruit', '🍎'], ['vegetable', '🥦'],
];

function categoryEmoji(categoryName: string): string {
  const lower = categoryName.toLowerCase();
  return CATEGORY_EMOJI.find(([keyword]) => lower.includes(keyword))?.[1] ?? '🛒';
}

interface ReceiptSnapshot {
  invoice: ApiInvoice;
  method: string;
  tendered?: number;
  change?: number;
  offline?: boolean;
}

export default function PosTouchPage() {
  const {
    items,
    customerId,
    customerName,
    couponCode,
    heldBills,
    addToCart,
    updateQty,
    removeItem,
    setCustomer,
    applyCoupon,
    holdCurrentBill,
    recallHeldBill,
    voidHeldBill,
    clearCart,
  } = useCartStore();
  const { session } = usePosSessionStore();
  const { refreshCounts } = useSyncStatusStore();
  const { showToast } = useToast();

  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [customers, setCustomers] = useState<LiveCustomer[]>([]);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [couponInput, setCouponInput] = useState(couponCode ?? '');

  const [payMethod, setPayMethod] = useState<PayMethod | null>(null);
  const [cashTendered, setCashTendered] = useState('');
  const [splitA, setSplitA] = useState('');
  const [splitB, setSplitB] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [receipt, setReceipt] = useState<ReceiptSnapshot | null>(null);
  const [heldBillsOpen, setHeldBillsOpen] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdLabel, setHoldLabel] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    Promise.all([listProducts(), listCategories(), listCustomers()])
      .then(([p, c, cu]) => {
        setProducts(p);
        setCategories(c);
        setCustomers(cu);
        cacheCatalog(p, c, cu);
      })
      .catch((err) => {
        if (!isNetworkError(err)) {
          showToast('Failed to load POS catalog', 'danger');
          return;
        }
        // Offline at startup — fall back to whatever was cached from the last
        // time this terminal was online, so the cashier can keep working.
        getCachedCatalog().then(({ products: cp, categories: cc, customers: ccu }) => {
          if (cp.length === 0) {
            showToast('Offline and no cached catalog yet — connect once before going offline', 'danger');
            return;
          }
          setProducts(cp);
          setCategories(cc);
          setCustomers(ccu);
          showToast('Offline — showing last synced catalog', 'warning');
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;
  const discountPercent =
    (selectedCustomer ? TIER_DISCOUNT[selectedCustomer.tier] : 0) + (couponCode === 'SAVE10' ? 10 : 0);
  const totals = useMemo(() => cartTotals(items, discountPercent), [items, discountPercent]);
  const cartCount = items.reduce((sum, i) => sum + i.qty, 0);
  const customerTier = selectedCustomer?.tier ?? null;

  const customerOptions = [
    { value: '', label: '👤 Walk-in Customer' },
    ...customers.map((c) => ({
      value: c.id,
      label: `${c.tier === 'STANDARD' ? '👤' : '⭐'} ${c.name} (${c.tier} - ${c.loyaltyPoints} pts)`,
    })),
  ];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === 'all' || p.categoryId === activeCategory;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === '' || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  function handleAddProduct(p: LiveProduct) {
    addToCart({ id: p.id, name: p.name, price: p.price, gstRate: p.gstRate });
  }

  function handleBarcodeDetected(code: string) {
    setScannerOpen(false);
    const product = products.find((p) => p.barcode && p.barcode === code);
    if (!product) {
      showToast(`No product matches scanned code "${code}"`, 'danger');
      return;
    }
    handleAddProduct(product);
    showToast(`Scanned: ${product.name}`, 'success');
  }

  function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      applyCoupon(null);
      return;
    }
    if (code === 'SAVE10') {
      applyCoupon(code);
      showToast('Coupon SAVE10 applied — 10% off', 'success');
    } else {
      showToast('Invalid coupon code. Try SAVE10.', 'danger');
    }
  }

  function openQuickPay(method: PayMethod) {
    if (items.length === 0) {
      showToast('Cart is empty', 'warning');
      return;
    }
    setCashTendered('');
    setSplitA('');
    setSplitB('');
    setPayMethod(method);
  }

  const tenderedAmount = parseFloat(cashTendered) || 0;
  const changeDue = tenderedAmount - totals.total;
  const splitAmountA = parseFloat(splitA) || 0;
  const splitAmountB = parseFloat(splitB) || 0;
  const splitValid = splitAmountA > 0 && splitAmountB > 0 && Math.abs(splitAmountA + splitAmountB - totals.total) < 0.5;

  const confirmDisabled =
    submitting || (payMethod === 'cash' ? tenderedAmount < totals.total : payMethod === 'split' ? !splitValid : false);

  async function confirmQuickPay() {
    if (!payMethod || confirmDisabled) return;
    setSubmitting(true);
    const invoiceInput = {
      customerId: customerId ?? undefined,
      paymentMethod: payMethodToApi[payMethod],
      items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
      discountPercent,
    };
    // Generated up front, not just on failure — if this exact request DID
    // reach the server but the response never made it back, the retried sync
    // later reuses this same key instead of risking a double-sale.
    const idempotencyKey = crypto.randomUUID();
    try {
      const invoice = await createInvoice(invoiceInput, idempotencyKey);
      setReceipt({
        invoice,
        method: methodLabels[payMethod],
        tendered: payMethod === 'cash' ? tenderedAmount : undefined,
        change: payMethod === 'cash' ? changeDue : undefined,
      });
      clearCart();
      setPayMethod(null);
      showToast('Payment successful', 'success');
      // Stock just moved server-side — refresh so the catalog reflects it.
      listProducts().then(setProducts).catch(() => {});
    } catch (err) {
      if (!isNetworkError(err)) {
        showToast(parseCheckoutError(err), 'danger');
        return;
      }

      // No network — queue it. The sale is real to the cashier and the
      // customer right now; it just hasn't reached the server yet.
      await queueSale(invoiceInput, idempotencyKey);
      for (const item of items) await decrementCachedStock(item.id, item.qty);
      setProducts((prev) =>
        prev.map((p) => {
          const item = items.find((i) => i.id === p.id);
          return item ? { ...p, stockQty: Math.max(0, p.stockQty - item.qty) } : p;
        }),
      );
      await refreshCounts();

      const offlineInvoice: ApiInvoice = {
        id: idempotencyKey,
        invoiceNumber: `OFFLINE-${idempotencyKey.slice(0, 8).toUpperCase()}`,
        status: 'PENDING_SYNC',
        paymentMethod: payMethodToApi[payMethod],
        customerName,
        subtotal: totals.subtotal.toFixed(2),
        taxTotal: totals.gst.toFixed(2),
        total: totals.total.toFixed(2),
        createdAt: new Date().toISOString(),
        items: items.map((i) => ({
          productId: i.id,
          quantity: i.qty,
          price: i.price.toFixed(2),
          gstRate: i.gstRate.toFixed(2),
          total: (i.price * i.qty).toFixed(2),
          product: { id: i.id, name: i.name },
        })),
      };
      setReceipt({
        invoice: offlineInvoice,
        method: methodLabels[payMethod],
        tendered: payMethod === 'cash' ? tenderedAmount : undefined,
        change: payMethod === 'cash' ? changeDue : undefined,
        offline: true,
      });
      clearCart();
      setPayMethod(null);
      showToast('Offline — sale queued, will sync when back online', 'warning');
    } finally {
      setSubmitting(false);
    }
  }

  function handleHoldBill() {
    if (items.length === 0) {
      showToast('Cart is empty — add items before holding', 'warning');
      return;
    }
    const label = holdLabel.trim() || `Order for ${customerName}`;
    holdCurrentBill(label, discountPercent);
    showToast('Bill held successfully', 'success');
    setHoldLabel('');
    setHoldModalOpen(false);
  }

  function handleRecall(id: string) {
    recallHeldBill(id);
    setHeldBillsOpen(false);
    showToast('Held bill recalled to cart', 'success');
  }

  function handleVoid(id: string) {
    voidHeldBill(id);
    showToast('Held bill voided', 'info');
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => setHoldModalOpen(true)}>
          <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
          Hold This Bill
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setHeldBillsOpen(true)}>
          <Clock className="w-3.5 h-3.5 text-purple-600" />
          Quick View Held Bills ({heldBills.length})
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        {/* LEFT: Product catalog */}
        <div className="lg:col-span-7 glass-card p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col space-y-4 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by Name, SKU or Barcode..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setScannerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition"
            >
              <Scan className="w-4 h-4" />
              <span className="hidden sm:inline">Scan SKU</span>
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${
                activeCategory === 'all'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              All Items ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {categoryEmoji(cat.name)} {cat.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 overflow-y-auto flex-1 pr-1 content-start">
            {filteredProducts.length === 0 && (
              <div className="col-span-full">
                <EmptyState icon={Search} title="No products found" description="Try a different search term or category." />
              </div>
            )}
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => handleAddProduct(p)}
                disabled={p.stockQty <= 0}
                className="pos-product-card flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center disabled:opacity-40 disabled:pointer-events-none"
              >
                <span className="text-3xl leading-none">{categoryEmoji(p.categoryName)}</span>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 line-clamp-2">{p.name}</span>
                <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">{formatINR(p.price)}</span>
                {p.stockQty <= 0 && <span className="text-[9px] font-bold text-red-500 uppercase">Out of stock</span>}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Cart & checkout */}
        <div className="lg:col-span-5 glass-card p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 overflow-hidden">
          <div className="space-y-3">
            <Select
              value={customerId ?? ''}
              onChange={(e) => {
                const id = e.target.value || null;
                const name = id ? (customers.find((c) => c.id === id)?.name ?? 'Walk-in Customer') : 'Walk-in Customer';
                setCustomer(id, name);
              }}
              options={customerOptions}
            />

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  <span>Active POS Order Cart</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Customer: <span className="font-bold text-slate-700 dark:text-slate-300">{customerName}</span>
                  {customerTier && customerTier !== 'STANDARD' && ` (${customerTier} Member${discountPercent > 0 ? ` - ${discountPercent}% Discount` : ''})`}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-extrabold text-xs">
                {cartCount} Items
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[180px]">
            {items.length === 0 && (
              <EmptyState icon={ShoppingCart} title="Cart is empty" description="Tap a product tile to add it to the order." />
            )}
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {formatINR(item.price)} &times; {item.qty} = {formatINR(item.price * item.qty)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQty(item.id, item.qty - 1)}
                    className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-bold">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.id, item.qty + 1)}
                    className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="Enter Coupon (e.g. SAVE10)..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
            />
            <button
              onClick={handleApplyCoupon}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-white dark:bg-slate-700 font-bold text-xs hover:bg-blue-600 transition"
            >
              Apply
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">{formatINR(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>GST Tax:</span>
              <span className="font-mono font-semibold">{formatINR(totals.gst)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount ({discountPercent}%):</span>
                <span className="font-mono">-{formatINR(totals.discount)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
              <span className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">Grand Total</span>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">{formatINR(totals.total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => openQuickPay('cash')}
              className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition font-bold text-xs flex flex-col items-center gap-1"
            >
              <Banknote className="w-4 h-4" />
              <span>Cash</span>
            </button>
            <button
              onClick={() => openQuickPay('upi')}
              className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white transition font-bold text-xs flex flex-col items-center gap-1"
            >
              <QrCode className="w-4 h-4" />
              <span>UPI / QR</span>
            </button>
            <button
              onClick={() => openQuickPay('card')}
              className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-600 hover:text-white transition font-bold text-xs flex flex-col items-center gap-1"
            >
              <CreditCard className="w-4 h-4" />
              <span>Card</span>
            </button>
            <button
              onClick={() => openQuickPay('split')}
              className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-600 hover:text-white transition font-bold text-xs flex flex-col items-center gap-1"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Split</span>
            </button>
          </div>

          <button
            onClick={() => openQuickPay('cash')}
            disabled={items.length === 0}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-xl shadow-blue-500/25 transition transform hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Printer className="w-5 h-5" />
            <span>Pay & Print Thermal Receipt ({formatINR(totals.total)})</span>
          </button>
        </div>
      </div>

      {/* Quick Pay Offcanvas */}
      <Drawer
        open={payMethod !== null}
        onClose={() => setPayMethod(null)}
        title={payMethod ? `Checkout — ${methodLabels[payMethod]}` : 'Checkout'}
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayMethod(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmQuickPay} disabled={confirmDisabled}>
              {submitting ? 'Processing…' : 'Confirm Payment & Print'}
            </Button>
          </>
        }
      >
        {payMethod === 'cash' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-500 dark:text-slate-400">
              Amount Due: <span className="font-black text-slate-900 dark:text-white font-mono">{formatINR(totals.total)}</span>
            </p>
            <Input
              label="Tendered Amount"
              type="number"
              min={0}
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
              placeholder="Enter cash received"
            />
            <div
              className={`p-3 rounded-xl border text-center font-mono font-black text-lg ${
                changeDue >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
              }`}
            >
              {changeDue >= 0 ? `Change Due: ${formatINR(changeDue)}` : `Short by: ${formatINR(Math.abs(changeDue))}`}
            </div>
          </div>
        )}

        {(payMethod === 'upi' || payMethod === 'card') && (
          <div className="space-y-3 text-xs text-center py-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center animate-pulse">
              {payMethod === 'upi' ? <QrCode className="w-7 h-7" /> : <CreditCard className="w-7 h-7" />}
            </div>
            <p className="font-bold text-slate-700 dark:text-slate-200">Waiting for payment confirmation...</p>
            <p className="text-slate-400">
              Amount: <span className="font-mono font-black text-slate-900 dark:text-white">{formatINR(totals.total)}</span>
            </p>
            <p className="text-slate-400">Press &ldquo;Confirm Payment &amp; Print&rdquo; once the {payMethod === 'upi' ? 'UPI' : 'card'} payment is received.</p>
          </div>
        )}

        {payMethod === 'split' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-500 dark:text-slate-400">
              Total to split: <span className="font-black text-slate-900 dark:text-white font-mono">{formatINR(totals.total)}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Payment 1 (₹)" type="number" min={0} value={splitA} onChange={(e) => setSplitA(e.target.value)} />
              <Input label="Payment 2 (₹)" type="number" min={0} value={splitB} onChange={(e) => setSplitB(e.target.value)} />
            </div>
            <p className={`font-semibold ${splitValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {splitValid
                ? 'Split amounts match the total.'
                : `Split total: ${formatINR(splitAmountA + splitAmountB)} — must equal ${formatINR(totals.total)}.`}
            </p>
          </div>
        )}
      </Drawer>

      {/* Thermal Receipt Offcanvas */}
      <Drawer
        open={receipt !== null}
        onClose={() => setReceipt(null)}
        title="Thermal Receipt"
        width="sm"
        footer={
          <>
            <Button variant="primary" className="flex-1" onClick={() => window.print()}>
              Print Thermal Receipt
            </Button>
            <Button variant="ghost" onClick={() => setReceipt(null)}>
              Close
            </Button>
          </>
        }
      >
        {receipt && (
          <div id="receipt-modal-body" className="space-y-3 font-mono text-[11px] text-slate-800 dark:text-slate-100">
            {receipt.offline && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-center text-[10px] font-bold uppercase tracking-wide">
                Offline — queued, will sync automatically
              </div>
            )}
            <div className="text-center space-y-0.5">
              <p className="text-sm font-black">ApexPOS Enterprise</p>
              <p>Downtown Flagship Store</p>
              <p className="font-bold">{receipt.invoice.invoiceNumber}</p>
              <p>{session?.registerName ?? 'Register 02'} &middot; Cashier: {session?.cashierName ?? 'Cashier'}</p>
              <p>{new Date(receipt.invoice.createdAt).toLocaleString('en-IN')}</p>
            </div>
            <div className="border-t border-dashed border-slate-400 pt-2 space-y-1">
              {receipt.invoice.items.map((item) => (
                <div key={item.productId} className="flex justify-between gap-2">
                  <span className="truncate">
                    {item.product.name} x{item.quantity}
                  </span>
                  <span>{formatINR(Number(item.price) * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-slate-400 pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatINR(Number(receipt.invoice.subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span>GST</span>
                <span>{formatINR(Number(receipt.invoice.taxTotal))}</span>
              </div>
              <div className="flex justify-between font-black text-sm border-t border-slate-400 pt-1">
                <span>TOTAL</span>
                <span>{formatINR(Number(receipt.invoice.total))}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid via</span>
                <span>{receipt.method}</span>
              </div>
              {receipt.tendered !== undefined && (
                <>
                  <div className="flex justify-between">
                    <span>Tendered</span>
                    <span>{formatINR(receipt.tendered)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Change</span>
                    <span>{formatINR(receipt.change ?? 0)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span>Customer</span>
                <span className="truncate">{receipt.invoice.customerName}</span>
              </div>
            </div>
            <p className="text-center pt-2 border-t border-dashed border-slate-400">Thank you for shopping with us!</p>
          </div>
        )}
      </Drawer>

      {/* Held Bills quick-access offcanvas */}
      <Drawer open={heldBillsOpen} onClose={() => setHeldBillsOpen(false)} title="Suspended & Held Bills" width="md">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {heldBills.length === 0 && <EmptyState icon={PauseCircle} title="No held bills" description="Bills you hold will appear here for quick recall." />}
          {heldBills.map((bill) => {
            const billTotals = cartTotals(bill.items, bill.discountPercent);
            return (
              <div
                key={bill.id}
                className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{bill.label}</p>
                  <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">{formatINR(billTotals.total)}</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {bill.customerName} &middot; {bill.items.length} item{bill.items.length === 1 ? '' : 's'} &middot; {new Date(bill.heldAt).toLocaleTimeString('en-IN')}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRecall(bill.id)}
                    className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 transition"
                  >
                    Recall
                  </button>
                  <button
                    onClick={() => handleVoid(bill.id)}
                    className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-[11px] hover:bg-red-600 hover:text-white transition"
                  >
                    Void
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Drawer>

      {/* Hold This Bill offcanvas */}
      <Drawer
        open={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        title="Hold This Bill"
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setHoldModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleHoldBill}>
              Hold Bill
            </Button>
          </>
        }
      >
        <Input
          label="Label / Reference"
          value={holdLabel}
          onChange={(e) => setHoldLabel(e.target.value)}
          placeholder={`Order for ${customerName}`}
          hint="Used to identify this bill in the Held Bills queue."
        />
      </Drawer>

      <BarcodeScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleBarcodeDetected} />
    </div>
  );
}
