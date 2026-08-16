import { useMemo, useState } from 'react';
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
import { Button, Input, Select, Modal, EmptyState, useToast } from '@pospe/ui-library';
import { useCartStore, cartTotals, type CartItem } from '../store/useCartStore';
import { usePosSessionStore } from '../store/usePosSessionStore';
import { posCategories, posProducts } from '../services/mockData/posProducts';
import { posCustomerOptions, getCustomerDiscountPercent, getCustomerTier } from '../services/mockData/posCustomers';
import { formatINR } from '../utils/format';

type PayMethod = 'cash' | 'upi' | 'card' | 'split';

const methodLabels: Record<PayMethod, string> = {
  cash: 'Cash',
  upi: 'UPI / QR',
  card: 'Card',
  split: 'Split Payment',
};

interface ReceiptSnapshot {
  items: CartItem[];
  customer: string;
  subtotal: number;
  gst: number;
  discount: number;
  total: number;
  method: string;
  tendered?: number;
  change?: number;
  paidAt: string;
}

export default function PosTouchPage() {
  const { items, customer, couponCode, heldBills, addToCart, updateQty, removeItem, setCustomer, applyCoupon, holdCurrentBill, recallHeldBill, voidHeldBill, clearCart } =
    useCartStore();
  const { session } = usePosSessionStore();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [couponInput, setCouponInput] = useState(couponCode ?? '');

  const [payMethod, setPayMethod] = useState<PayMethod | null>(null);
  const [cashTendered, setCashTendered] = useState('');
  const [splitA, setSplitA] = useState('');
  const [splitB, setSplitB] = useState('');

  const [receipt, setReceipt] = useState<ReceiptSnapshot | null>(null);
  const [heldBillsOpen, setHeldBillsOpen] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdLabel, setHoldLabel] = useState('');

  const discountPercent = getCustomerDiscountPercent(customer) + (couponCode === 'SAVE10' ? 10 : 0);
  const totals = useMemo(() => cartTotals(items, discountPercent), [items, discountPercent]);
  const cartCount = items.reduce((sum, i) => sum + i.qty, 0);
  const customerTier = getCustomerTier(customer);

  const filteredProducts = posProducts.filter((p) => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const q = search.trim().toLowerCase();
    const matchesSearch = q === '' || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  function handleAddProduct(p: (typeof posProducts)[number]) {
    addToCart({ id: p.id, name: p.name, price: p.price, gstRate: p.gstRate });
  }

  function handleScanBarcode() {
    const p = posProducts[Math.floor(Math.random() * posProducts.length)];
    handleAddProduct(p);
    showToast(`Scanned: ${p.name}`, 'success');
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
    payMethod === 'cash' ? tenderedAmount < totals.total : payMethod === 'split' ? !splitValid : false;

  function confirmQuickPay() {
    if (!payMethod || confirmDisabled) return;
    const snapshot: ReceiptSnapshot = {
      items,
      customer,
      subtotal: totals.subtotal,
      gst: totals.gst,
      discount: totals.discount,
      total: totals.total,
      method: methodLabels[payMethod],
      tendered: payMethod === 'cash' ? tenderedAmount : undefined,
      change: payMethod === 'cash' ? changeDue : undefined,
      paidAt: new Date().toISOString(),
    };
    setReceipt(snapshot);
    clearCart();
    setPayMethod(null);
    showToast('Payment successful', 'success');
  }

  function handleHoldBill() {
    if (items.length === 0) {
      showToast('Cart is empty — add items before holding', 'warning');
      return;
    }
    const label = holdLabel.trim() || `Order for ${customer}`;
    holdCurrentBill(label);
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
              onClick={handleScanBarcode}
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
              All Items ({posProducts.length})
            </button>
            {posCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {cat.emoji} {cat.label}
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
                className="pos-product-card flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center"
              >
                <span className="text-3xl leading-none">{p.emoji}</span>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 line-clamp-2">{p.name}</span>
                <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">{formatINR(p.price)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Cart & checkout */}
        <div className="lg:col-span-5 glass-card p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 overflow-hidden">
          <div className="space-y-3">
            <Select
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              options={posCustomerOptions}
            />

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  <span>Active POS Order Cart</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Customer: <span className="font-bold text-slate-700 dark:text-slate-300">{customer}</span>
                  {customerTier && customerTier !== 'Standard' && ` (${customerTier} Member${discountPercent > 0 ? ` - ${discountPercent}% Discount` : ''})`}
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

      {/* Quick Pay Modal */}
      <Modal
        open={payMethod !== null}
        onClose={() => setPayMethod(null)}
        title={payMethod ? `Checkout — ${methodLabels[payMethod]}` : ''}
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayMethod(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmQuickPay} disabled={confirmDisabled}>
              Confirm Payment & Print
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
      </Modal>

      {/* Thermal Receipt Modal */}
      <Modal open={receipt !== null} onClose={() => setReceipt(null)} maxWidth="sm">
        {receipt && (
          <div id="receipt-modal-body" className="space-y-3 font-mono text-[11px] text-slate-800 dark:text-slate-100">
            <div className="text-center space-y-0.5">
              <p className="text-sm font-black">ApexPOS Enterprise</p>
              <p>Downtown Flagship Store</p>
              <p>{session?.registerName ?? 'Register 02'} &middot; Cashier: {session?.cashierName ?? 'Cashier'}</p>
              <p>{new Date(receipt.paidAt).toLocaleString('en-IN')}</p>
            </div>
            <div className="border-t border-dashed border-slate-400 pt-2 space-y-1">
              {receipt.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    {item.name} x{item.qty}
                  </span>
                  <span>{formatINR(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-slate-400 pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatINR(receipt.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST</span>
                <span>{formatINR(receipt.gst)}</span>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatINR(receipt.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm border-t border-slate-400 pt-1">
                <span>TOTAL</span>
                <span>{formatINR(receipt.total)}</span>
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
                <span className="truncate">{receipt.customer}</span>
              </div>
            </div>
            <p className="text-center pt-2 border-t border-dashed border-slate-400">Thank you for shopping with us!</p>
          </div>
        )}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700"
          >
            Print Thermal Receipt
          </button>
          <button
            onClick={() => setReceipt(null)}
            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Held Bills quick-access modal */}
      <Modal open={heldBillsOpen} onClose={() => setHeldBillsOpen(false)} title="Suspended & Held Bills" maxWidth="md">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {heldBills.length === 0 && <EmptyState icon={PauseCircle} title="No held bills" description="Bills you hold will appear here for quick recall." />}
          {heldBills.map((bill) => {
            const billTotals = cartTotals(bill.items, getCustomerDiscountPercent(bill.customer));
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
                  {bill.customer} &middot; {bill.items.length} item{bill.items.length === 1 ? '' : 's'} &middot; {new Date(bill.heldAt).toLocaleTimeString('en-IN')}
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
      </Modal>

      {/* Hold This Bill modal */}
      <Modal
        open={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        title="Hold This Bill"
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
          placeholder={`Order for ${customer}`}
          hint="Used to identify this bill in the Held Bills queue."
        />
      </Modal>
    </div>
  );
}
