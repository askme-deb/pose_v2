// Master Product Catalog Database
const sampleProducts = [
  { id: 1, name: 'Organic Almond Milk 1L', category: 'dairy', price: 249.00, sku: 'SKU-8829', taxRate: 18, stock: 45, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop&q=80' },
  { id: 2, name: 'Artisan Dark Chocolate 85%', category: 'confectionery', price: 180.00, sku: 'SKU-4401', taxRate: 18, stock: 32, image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&auto=format&fit=crop&q=80' },
  { id: 3, name: 'Extra Virgin Olive Oil 500ml', category: 'gourmet', price: 650.00, sku: 'SKU-9921', taxRate: 12, stock: 18, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop&q=80' },
  { id: 4, name: 'Farm Fresh Organic Eggs 12s', category: 'fresh', price: 120.00, sku: 'SKU-1048', taxRate: 0, stock: 80, image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&auto=format&fit=crop&q=80' },
  { id: 5, name: 'Greek Yogurt Plain 500g', category: 'dairy', price: 130.00, sku: 'SKU-5520', taxRate: 5, stock: 25, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&auto=format&fit=crop&q=80' },
  { id: 6, name: 'Organic Whole Wheat Bread', category: 'bakery', price: 65.00, sku: 'SKU-2201', taxRate: 0, stock: 50, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop&q=80' },
  { id: 7, name: 'Cold Pressed Apple Juice 1L', category: 'beverages', price: 195.00, sku: 'SKU-3390', taxRate: 12, stock: 40, image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=200&auto=format&fit=crop&q=80' },
  { id: 8, name: 'Sparkling Mineral Water 750ml', category: 'beverages', price: 110.00, sku: 'SKU-7712', taxRate: 18, stock: 65, image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=200&auto=format&fit=crop&q=80' },
  { id: 9, name: 'Premium Arabica Coffee 250g', category: 'beverages', price: 450.00, sku: 'SKU-8811', taxRate: 18, stock: 22, image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200&auto=format&fit=crop&q=80' },
  { id: 10, name: 'Wildflower Organic Honey 350g', category: 'gourmet', price: 380.00, sku: 'SKU-6610', taxRate: 5, stock: 15, image: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=200&auto=format&fit=crop&q=80' },
  { id: 11, name: 'Roasted Cashew Nuts 200g', category: 'bakery', price: 320.00, sku: 'SKU-4490', taxRate: 12, stock: 28, image: 'https://images.unsplash.com/photo-1509358271058-acd01cc9386a?w=200&auto=format&fit=crop&q=80' },
  { id: 12, name: 'Italian Pasta Penne 500g', category: 'gourmet', price: 140.00, sku: 'SKU-1188', taxRate: 12, stock: 60, image: 'https://images.unsplash.com/photo-1621996346565-e3def616324c?w=200&auto=format&fit=crop&q=80' }
];

// POS State Management
let cart = [
  { id: 1, name: 'Organic Almond Milk 1L', price: 249.00, qty: 2, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=150&auto=format&fit=crop&q=80', hsn: '04029990', taxRate: 18 },
  { id: 2, name: 'Artisan Dark Chocolate 85%', price: 180.00, qty: 3, image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=150&auto=format&fit=crop&q=80', hsn: '18069020', taxRate: 18 },
  { id: 3, name: 'Extra Virgin Olive Oil 500ml', price: 650.00, qty: 1, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150&auto=format&fit=crop&q=80', hsn: '15091000', taxRate: 12 }
];

let appliedDiscountRate = 0.05; // Default Sarah Jenkins VIP 5%
let activeCategoryFilter = 'all';
let activeSearchQuery = '';
let activePaymentMode = 'cash';
let heldBills = [
  { id: 'HLD-904', customer: 'Walk-in Customer', itemsCount: 4, amount: 1420.00, time: '14:22 PM' },
  { id: 'HLD-905', customer: 'TechCorp Ltd', itemsCount: 8, amount: 4890.00, time: '15:10 PM' }
];

// Dynamic Product Touch Grid Generator
function renderProductGrid(category = activeCategoryFilter, query = activeSearchQuery) {
  const container = document.getElementById('pos-product-grid');
  if (!container) return;

  activeCategoryFilter = category;
  activeSearchQuery = query;

  let filtered = sampleProducts;
  if (category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }
  if (query && query.trim() !== '') {
    const q = query.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <i data-lucide="package-search" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
        <p class="font-bold text-xs">No products matched your filter</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  let html = '';
  filtered.forEach(p => {
    html += `
      <div onclick="addToCart(${p.id})" class="pos-product-card glass-card p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 cursor-pointer hover:border-blue-500 transition group flex flex-col justify-between select-none">
        <div>
          <div class="relative w-full h-24 rounded-xl overflow-hidden mb-2.5 bg-slate-100 dark:bg-slate-900">
            <img src="${p.image}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
            <span class="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[9px] font-bold">${p.sku}</span>
          </div>
          <h4 class="font-bold text-xs text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition">${p.name}</h4>
          <p class="text-[10px] text-slate-400 mt-0.5">Stock: <span class="font-semibold text-slate-600 dark:text-slate-300">${p.stock} units</span></p>
        </div>

        <div class="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
          <span class="font-black text-sm text-blue-600 dark:text-blue-400">₹${p.price.toFixed(2)}</span>
          <button class="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20 group-hover:scale-110 transition">
            +
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

function filterPosProducts(category, btn) {
  document.querySelectorAll('.pos-cat-btn').forEach(b => {
    b.className = 'pos-cat-btn px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-800';
  });
  if (btn) {
    btn.className = 'pos-cat-btn px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold whitespace-nowrap shadow-sm';
  }
  renderProductGrid(category, activeSearchQuery);
}

function searchPosProducts(query) {
  renderProductGrid(activeCategoryFilter, query);
}

function simulateBarcodeScan() {
  const randomProd = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
  addToCart(randomProd.id);
  showToast(`Barcode Scanned: ${randomProd.sku} (${randomProd.name})`, 'success');
}

function renderCart() {
  const containers = [
    document.getElementById('pos-cart-items'),
    document.getElementById('pos-cart-items-master'),
    document.getElementById('pos-cart-items-container')
  ].filter(Boolean);

  if (!containers.length) return;

  let subtotal = 0;
  let itemCount = 0;
  let cartHtml = '';

  if (cart.length === 0) {
    cartHtml = `
      <div class="py-12 text-center text-slate-400 space-y-2">
        <i data-lucide="shopping-bag" class="w-10 h-10 mx-auto opacity-40"></i>
        <p class="font-bold text-xs">POS Cart is Empty</p>
        <p class="text-[10px]">Tap products from catalog grid to start billing</p>
      </div>
    `;
  } else {
    cart.forEach(item => {
      const itemTotal = item.price * item.qty;
      subtotal += itemTotal;
      itemCount += item.qty;

      cartHtml += `
        <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs shadow-sm">
          <div class="flex items-center gap-3">
            <img src="${item.image}" class="w-10 h-10 rounded-xl object-cover">
            <div>
              <h4 class="font-bold text-slate-900 dark:text-white">${item.name}</h4>
              <p class="text-[10px] text-slate-400">₹${item.price.toFixed(2)} x ${item.qty} (${item.taxRate || 18}% GST)</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden">
              <button onclick="updateQty(${item.id}, -1)" class="px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 font-extrabold text-slate-600 dark:text-slate-300">-</button>
              <span class="px-2 font-black text-slate-900 dark:text-white text-xs">${item.qty}</span>
              <button onclick="updateQty(${item.id}, 1)" class="px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 font-extrabold text-slate-600 dark:text-slate-300">+</button>
            </div>
            <span class="font-black text-blue-600 dark:text-blue-400 w-16 text-right font-mono">₹${itemTotal.toFixed(2)}</span>
            <button onclick="updateQty(${item.id}, -${item.qty})" class="p-1 text-slate-400 hover:text-red-500 transition">✕</button>
          </div>
        </div>
      `;
    });
  }

  const tax = subtotal * 0.18;
  const discountVal = subtotal * appliedDiscountRate;
  const grandTotal = subtotal + tax - discountVal;

  containers.forEach(c => c.innerHTML = cartHtml);

  const subEl = document.getElementById('pos-summary-subtotal');
  const taxEl = document.getElementById('pos-summary-tax');
  const discRow = document.getElementById('pos-discount-row');
  const discEl = document.getElementById('pos-summary-discount');
  const grandEl = document.getElementById('pos-summary-grandtotal');
  const countBadge = document.getElementById('pos-cart-count-badge');

  if (subEl) subEl.innerText = `₹${subtotal.toFixed(2)}`;
  if (taxEl) taxEl.innerText = `₹${tax.toFixed(2)}`;
  if (grandEl) grandEl.innerText = `₹${grandTotal.toFixed(2)}`;
  if (countBadge) countBadge.innerText = `${itemCount} Item${itemCount !== 1 ? 's' : ''}`;

  if (appliedDiscountRate > 0) {
    if (discRow) discRow.classList.remove('hidden');
    if (discEl) discEl.innerText = `-₹${discountVal.toFixed(2)}`;
  } else {
    if (discRow) discRow.classList.add('hidden');
  }

  ['pos-pay-btn-amount', 'pos-pay-btn-amount-master'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = `₹${grandTotal.toFixed(2)}`;
  });

  if (window.lucide) window.lucide.createIcons();
}

function updateQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    renderCart();
  }
}

function addToCart(id) {
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    const prod = sampleProducts.find(p => p.id === id);
    if (prod) cart.push({ ...prod, qty: 1, hsn: '04029990', taxRate: prod.taxRate || 18 });
  }
  renderCart();
  showToast('Item added to POS cart', 'success');
}

function onCustomerChange(select) {
  const val = select.value;
  const banner = document.getElementById('pos-customer-banner');
  if (val === 'sarah') {
    appliedDiscountRate = 0.05;
    if (banner) banner.innerHTML = 'Customer: <span class="font-bold text-slate-700 dark:text-slate-300">Sarah Jenkins</span> (VIP Member - 5% Discount)';
    showToast('Applied Sarah Jenkins VIP 5% Member Discount', 'info');
  } else if (val === 'corp') {
    appliedDiscountRate = 0.10;
    if (banner) banner.innerHTML = 'Customer: <span class="font-bold text-slate-700 dark:text-slate-300">TechCorp Ltd</span> (B2B Credit - 10% Trade Discount)';
    showToast('Applied TechCorp 10% Trade Discount', 'info');
  } else {
    appliedDiscountRate = 0;
    if (banner) banner.innerHTML = 'Customer: <span class="font-bold text-slate-700 dark:text-slate-300">Standard Walk-in Customer</span>';
  }
  renderCart();
}

function applyCouponCode() {
  const input = document.getElementById('pos-coupon-code');
  if (!input) return;
  const code = input.value.trim().toUpperCase();

  if (code === 'SAVE10') {
    appliedDiscountRate = 0.10;
    showToast('Promo Code SAVE10 Applied! 10% Discount', 'success');
  } else if (code === 'VIP5') {
    appliedDiscountRate = 0.05;
    showToast('Promo Code VIP5 Applied! 5% Discount', 'success');
  } else if (code === '') {
    showToast('Please enter a coupon code', 'warning');
    return;
  } else {
    showToast('Invalid Coupon Code', 'danger');
    return;
  }
  renderCart();
}

function clearCart() {
  if (cart.length === 0) return;
  cart = [];
  renderCart();
  showToast('POS Cart Cleared', 'info');
}

function holdCurrentBill() {
  if (cart.length === 0) {
    showToast('Cannot hold an empty cart!', 'warning');
    return;
  }
  const holdId = `HLD-${Math.floor(1000 + Math.random() * 9000)}`;
  let subtotal = 0;
  cart.forEach(i => subtotal += i.price * i.qty);

  heldBills.push({
    id: holdId,
    customer: 'Sarah Jenkins',
    itemsCount: cart.length,
    amount: subtotal * 1.18,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  cart = [];
  renderCart();
  updateHeldBillsBadge();
  showToast(`Current Bill placed on Hold (${holdId})`, 'warning');
}

function updateHeldBillsBadge() {
  const badge = document.getElementById('held-count-badge');
  if (badge) badge.innerText = heldBills.length;
}

function openHeldBillsModal() {
  const modal = document.getElementById('held-bills-modal');
  const container = document.getElementById('held-bills-list');
  if (!modal || !container) return;

  if (heldBills.length === 0) {
    container.innerHTML = '<p class="text-center text-slate-400 py-6">No held bills suspended.</p>';
  } else {
    let html = '';
    heldBills.forEach(b => {
      html += `
        <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div class="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span class="text-blue-600 font-mono">${b.id}</span>
              <span class="text-[10px] text-slate-400 font-normal">${b.time}</span>
            </div>
            <p class="text-[10px] text-slate-400">${b.customer} • ${b.itemsCount} Items</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-black text-slate-900 dark:text-white font-mono">₹${b.amount.toFixed(2)}</span>
            <button onclick="recallHeldBill('${b.id}')" class="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700">Recall</button>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  modal.classList.remove('hidden');
}

function recallHeldBill(id) {
  const billIndex = heldBills.findIndex(b => b.id === id);
  if (billIndex !== -1) {
    heldBills.splice(billIndex, 1);
    cart = [
      { id: 1, name: 'Organic Almond Milk 1L', price: 249.00, qty: 2, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=150&auto=format&fit=crop&q=80', hsn: '04029990', taxRate: 18 },
      { id: 3, name: 'Extra Virgin Olive Oil 500ml', price: 650.00, qty: 1, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150&auto=format&fit=crop&q=80', hsn: '15091000', taxRate: 12 }
    ];
    renderCart();
    updateHeldBillsBadge();
    closeHeldBillsModal();
    showToast(`Recalled Held Bill ${id} into active cart`, 'success');
  }
}

function closeHeldBillsModal() {
  document.getElementById('held-bills-modal')?.classList.add('hidden');
}

function openQuickPayModal(mode) {
  activePaymentMode = mode;
  const modal = document.getElementById('quick-pay-modal');
  const title = document.getElementById('quick-pay-modal-title');
  const body = document.getElementById('quick-pay-modal-body');
  if (!modal || !body) return;

  let subtotal = 0;
  cart.forEach(i => subtotal += i.price * i.qty);
  const tax = subtotal * 0.18;
  const discountVal = subtotal * appliedDiscountRate;
  const total = subtotal + tax - discountVal;

  if (mode === 'cash') {
    if (title) title.innerText = 'Cash Checkout & Change Calculator';
    body.innerHTML = `
      <div class="space-y-3">
        <div class="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 flex justify-between items-center">
          <span class="font-bold text-slate-500">Amount Due:</span>
          <span class="text-xl font-black text-blue-600 font-mono">₹${total.toFixed(2)}</span>
        </div>
        <div>
          <label class="font-bold block mb-1">Cash Tendered by Customer (₹)</label>
          <input type="number" id="cash-tendered-input" onkeyup="calculateCashChange(${total})" value="${Math.ceil(total / 100) * 100}" class="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-lg font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        <div class="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
          <span class="font-bold text-emerald-600">Change to Return:</span>
          <span id="cash-change-return" class="text-lg font-black text-emerald-600 font-mono">₹${(Math.ceil(total / 100) * 100 - total).toFixed(2)}</span>
        </div>
      </div>
    `;
  } else if (mode === 'upi') {
    if (title) title.innerText = 'UPI / Dynamic QR Code Checkout';
    body.innerHTML = `
      <div class="space-y-3 text-center py-2">
        <div class="w-40 h-40 mx-auto p-2 bg-white rounded-2xl border border-slate-300 shadow-md flex items-center justify-center">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=apexpos@icici&pn=ApexSupermarket&am=${total.toFixed(2)}" class="w-full h-full object-contain">
        </div>
        <p class="font-extrabold text-slate-900 dark:text-white">Scan with GooglePay, PhonePe or Paytm</p>
        <p class="text-slate-400 text-[10px]">UPI Amount: <span class="font-bold text-blue-600 font-mono">₹${total.toFixed(2)}</span></p>
      </div>
    `;
  } else if (mode === 'card') {
    if (title) title.innerText = 'Card Terminal Terminal Swipe';
    body.innerHTML = `
      <div class="space-y-3 text-center py-4">
        <div class="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto">
          <i data-lucide="credit-card" class="w-6 h-6"></i>
        </div>
        <p class="font-extrabold text-slate-900 dark:text-white">Insert or Tap Credit/Debit Card</p>
        <p class="text-slate-400">Verifying POS Terminal EDC Connection... <span class="text-emerald-500 font-bold">Ready</span></p>
      </div>
    `;
  } else {
    if (title) title.innerText = 'Split Payment';
    body.innerHTML = `
      <div class="space-y-3">
        <div class="flex justify-between"><span>Cash Portion:</span><input type="number" value="${(total / 2).toFixed(2)}" class="w-28 p-1.5 rounded-lg border text-right font-mono"></div>
        <div class="flex justify-between"><span>UPI Portion:</span><input type="number" value="${(total / 2).toFixed(2)}" class="w-28 p-1.5 rounded-lg border text-right font-mono"></div>
      </div>
    `;
  }

  modal.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function calculateCashChange(due) {
  const tendered = parseFloat(document.getElementById('cash-tendered-input')?.value || 0);
  const returnEl = document.getElementById('cash-change-return');
  const change = tendered - due;
  if (returnEl) {
    returnEl.innerText = change >= 0 ? `₹${change.toFixed(2)}` : 'Insufficient Tender';
  }
}

function closeQuickPayModal() {
  document.getElementById('quick-pay-modal')?.classList.add('hidden');
}

function confirmQuickPay() {
  closeQuickPayModal();
  completeCheckout();
}


function completeCheckout() {
  const modal = document.getElementById('receipt-modal');
  const modalBody = document.getElementById('receipt-modal-body');
  if (!modal || !modalBody) return;

  const now = new Date().toLocaleString();
  let subtotal = 0;
  let receiptRows = '';

  cart.forEach(i => {
    const total = i.price * i.qty;
    subtotal += total;
    receiptRows += `<tr><td>${i.name} (x${i.qty})</td><td style="text-align:right">₹${total.toFixed(2)}</td></tr>`;
  });

  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;

  modalBody.innerHTML = `
    <div style="font-family: monospace; text-align: center; font-size: 12px;" class="space-y-2">
      <h2 style="font-weight: bold; font-size: 16px;">APEX SUPERMARKET</h2>
      <p>Downtown Flagship Branch</p>
      <p>GSTIN: 27AAAAA0000A1Z5</p>
      <hr style="border-top: 1px dashed #ccc; margin: 8px 0;">
      <p>Date: ${now}</p>
      <p>Invoice #: INV-2026-9821</p>
      <hr style="border-top: 1px dashed #ccc; margin: 8px 0;">
      <table style="width: 100%; text-align: left;">
        ${receiptRows}
      </table>
      <hr style="border-top: 1px dashed #ccc; margin: 8px 0;">
      <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>₹${subtotal.toFixed(2)}</span></div>
      <div style="display: flex; justify-content: space-between;"><span>GST (18%):</span><span>₹${tax.toFixed(2)}</span></div>
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;"><span>GRAND TOTAL:</span><span>₹${grandTotal.toFixed(2)}</span></div>
      <hr style="border-top: 1px dashed #ccc; margin: 8px 0;">
      <p>Thank you for shopping at Apex!</p>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeReceiptModal() {
  document.getElementById('receipt-modal')?.classList.add('hidden');
}

function toggleSearchModal() {
  document.getElementById('search-modal')?.classList.toggle('hidden');
}

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
  setTimeout(initCharts, 100);
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const colors = {
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-500 text-white',
    danger: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white'
  };

  toast.className = `px-4 py-3 rounded-xl ${colors[type] || colors.info} text-xs font-bold shadow-xl flex items-center gap-2 animate-slide-up`;
  toast.innerHTML = `<span>${msg}</span>`;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// FLUID MOBILE RESPONSIVE DRAWER MANAGER
function toggleMobileMenu() {
  let drawer = document.getElementById('mobile-menu-drawer');
  let backdrop = document.getElementById('mobile-menu-backdrop');

  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'mobile-menu-backdrop';
    backdrop.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 hidden';
    backdrop.onclick = closeMobileMenu;
    document.body.appendChild(backdrop);
  }

  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'mobile-menu-drawer';
    drawer.className = 'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-2xl transform -translate-x-full transition-transform duration-300 ease-in-out flex flex-col justify-between p-5 text-slate-900 dark:text-white';
    document.body.appendChild(drawer);
  }

  drawer.innerHTML = `
    <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
      <div class="flex items-center gap-2">
        <img src="images/logo.svg" alt="ApexPOS Logo" class="h-8">
      </div>
      <button onclick="closeMobileMenu()" class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs">✕</button>
    </div>

    <div class="flex-1 overflow-y-auto py-4 space-y-5 text-xs font-medium">
      <div>
        <div class="px-2 text-[10px] font-extrabold uppercase text-blue-600 dark:text-blue-400 mb-2">Tenant Operations</div>
        <div class="space-y-1">
          <a href="dashboard.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="layout-dashboard" class="w-4 h-4 text-blue-600"></i><span>Tenant Dashboard</span></a>
          <a href="pos-touch.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="zap" class="w-4 h-4 text-indigo-600"></i><span>POS Billing Terminal</span></a>
          <a href="pos-hold-suspend.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="pause-circle" class="w-4 h-4 text-amber-500"></i><span>Hold Bills</span></a>
          <a href="inventory-products.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="box" class="w-4 h-4 text-purple-600"></i><span>Inventory Catalog</span></a>
          <a href="inventory-categories.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="tags" class="w-4 h-4 text-cyan-600"></i><span>Categories & Brands</span></a>
          <a href="inventory-stock-adjust.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="sliders" class="w-4 h-4 text-rose-500"></i><span>Stock Adjustment</span></a>
          <a href="purchase-orders.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="truck" class="w-4 h-4 text-blue-500"></i><span>Purchase Orders</span></a>
          <a href="sales-invoices.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="receipt" class="w-4 h-4 text-emerald-600"></i><span>Sales Invoices</span></a>
          <a href="warehouse-transfers.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="warehouse" class="w-4 h-4 text-amber-600"></i><span>Warehouses</span></a>
          <a href="crm-customers.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="users" class="w-4 h-4 text-pink-600"></i><span>CRM & Loyalty</span></a>
          <a href="gst-reports.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="file-check-2" class="w-4 h-4 text-emerald-500"></i><span>GST Tax Suite</span></a>
          <a href="reports-analytics.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="bar-chart-3" class="w-4 h-4 text-violet-600"></i><span>Analytics & Reports</span></a>
        </div>
      </div>
      <div>
        <div class="px-2 text-[10px] font-extrabold uppercase text-purple-600 dark:text-purple-400 mb-2">Super Admin</div>
        <div class="space-y-1">
          <a href="superadmin-dashboard.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="shield-check" class="w-4 h-4 text-purple-600"></i><span>Super Admin Overview</span></a>
          <a href="superadmin-tenants.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><i data-lucide="building" class="w-4 h-4 text-indigo-600"></i><span>Tenant Management</span></a>
        </div>
      </div>
    </div>
  `;

  backdrop.classList.remove('hidden');
  setTimeout(() => {
    drawer.classList.remove('-translate-x-full');
    if (window.lucide) window.lucide.createIcons();
  }, 10);
}

function closeMobileMenu() {
  const drawer = document.getElementById('mobile-menu-drawer');
  const backdrop = document.getElementById('mobile-menu-backdrop');

  if (drawer) drawer.classList.add('-translate-x-full');
  setTimeout(() => {
    if (backdrop) backdrop.classList.add('hidden');
  }, 300);
}

// INTERACTIVE HEADER & NAV MENU DROPDOWNS MANAGER
function toggleNavCategoryDropdown(id, event) {
  if (event) event.stopPropagation();
  closeAllHeaderDropdowns();

  const menu = document.getElementById(id);
  if (menu) menu.classList.toggle('hidden');
}

function toggleTenantDropdown(event) {
  if (event) event.stopPropagation();
  closeAllHeaderDropdowns();

  let menu = document.getElementById('tenant-dropdown-menu');
  if (!menu) {
    const parent = document.getElementById('tenant-dropdown-container');
    if (!parent) return;
    menu = document.createElement('div');
    menu.id = 'tenant-dropdown-menu';
    menu.className = 'absolute top-full left-0 mt-2 w-64 glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1 animate-scale-in';
    menu.innerHTML = `
      <div class="px-3 py-1.5 font-bold uppercase text-[10px] text-slate-400">Select Business Tenant</div>
      <button onclick="selectTenant('Apex Supermarket Chain')" class="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center justify-between">
        <span>Apex Supermarket Chain</span>
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
      </button>
      <button onclick="selectTenant('Metro Hypermarket Ltd')" class="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
        <span>Metro Hypermarket Ltd</span>
      </button>
      <button onclick="selectTenant('QuickBite Restaurant Group')" class="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
        <span>QuickBite Restaurant Group</span>
      </button>
    `;
    parent.appendChild(menu);
  } else {
    menu.classList.toggle('hidden');
  }
}

function selectTenant(name) {
  const label = document.getElementById('tenant-label-text');
  if (label) label.innerText = name;
  showToast(`Switched Tenant to ${name}`, 'success');
  closeAllHeaderDropdowns();
}

function toggleBranchDropdown(event) {
  if (event) event.stopPropagation();
  closeAllHeaderDropdowns();

  let menu = document.getElementById('branch-dropdown-menu');
  if (!menu) {
    const parent = document.getElementById('branch-dropdown-container');
    if (!parent) return;
    menu = document.createElement('div');
    menu.id = 'branch-dropdown-menu';
    menu.className = 'absolute top-full left-0 mt-2 w-64 glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1 animate-scale-in';
    menu.innerHTML = `
      <div class="px-3 py-1.5 font-bold uppercase text-[10px] text-slate-400">Select Store Branch</div>
      <button onclick="selectBranch('Downtown Flagship')" class="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center justify-between">
        <span>Downtown Flagship</span>
        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
      </button>
      <button onclick="selectBranch('Suburban Outlet')" class="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
        <span>Suburban Outlet</span>
      </button>
      <button onclick="selectBranch('Airport Express Kiosk')" class="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
        <span>Airport Express Kiosk</span>
      </button>
      <button onclick="selectBranch('Central Warehouse A')" class="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
        <span>Central Warehouse A</span>
      </button>
    `;
    parent.appendChild(menu);
  } else {
    menu.classList.toggle('hidden');
  }
}

function selectBranch(name) {
  const label = document.getElementById('branch-label-text');
  if (label) label.innerText = name;
  showToast(`Switched Branch Store to ${name}`, 'info');
  closeAllHeaderDropdowns();
}

function toggleProfileDropdown(event) {
  if (event) event.stopPropagation();
  closeAllHeaderDropdowns();

  let menu = document.getElementById('profile-dropdown-menu');
  if (!menu) {
    const parent = document.getElementById('profile-dropdown-container');
    if (!parent) return;
    menu = document.createElement('div');
    menu.id = 'profile-dropdown-menu';
    menu.className = 'absolute top-full right-0 mt-2 w-56 glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1 animate-scale-in';
    menu.innerHTML = `
      <div class="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
        <p class="font-bold text-slate-900 dark:text-white">Alexander Wright</p>
        <p class="text-[10px] text-slate-400">admin@apexsupermarket.com</p>
      </div>
      <a href="business-profile.html" class="block px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold">Company Profile</a>
      <a href="user-roles.html" class="block px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">Roles & RBAC</a>
      <a href="login.html" class="block px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-600 font-bold">Sign Out</a>
    `;
    parent.appendChild(menu);
  } else {
    menu.classList.toggle('hidden');
  }
}

function closeAllHeaderDropdowns() {
  ['tenant-dropdown-menu', 'branch-dropdown-menu', 'profile-dropdown-menu', 'nav-dropdown-tenant', 'nav-dropdown-superadmin', 'nav-dropdown-public'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });
}

document.addEventListener('click', closeAllHeaderDropdowns);

// Global Slide-Over Side Panel Drawer Manager
function openSidePanel(title, htmlContent) {
  let backdrop = document.getElementById('side-panel-backdrop');
  let drawer = document.getElementById('side-panel-drawer');

  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'side-panel-backdrop';
    backdrop.className = 'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 hidden';
    backdrop.onclick = closeSidePanel;
    document.body.appendChild(backdrop);
  }

  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'side-panel-drawer';
    drawer.className = 'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-2xl transform translate-x-full transition-transform duration-300 ease-in-out flex flex-col justify-between text-slate-900 dark:text-white';
    document.body.appendChild(drawer);
  }

  drawer.innerHTML = `
    <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-extrabold tracking-tight">${title}</h2>
        <p class="text-xs text-slate-400 mt-0.5">Complete form details to save record</p>
      </div>
      <button onclick="closeSidePanel()" class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold text-xs">✕</button>
    </div>
    <div class="flex-1 overflow-y-auto p-6 space-y-4">
      ${htmlContent}
    </div>
  `;

  backdrop.classList.remove('hidden');
  setTimeout(() => {
    drawer.classList.remove('translate-x-full');
  }, 10);
}

function closeSidePanel() {
  const drawer = document.getElementById('side-panel-drawer');
  const backdrop = document.getElementById('side-panel-backdrop');

  if (drawer) drawer.classList.add('translate-x-full');
  setTimeout(() => {
    if (backdrop) backdrop.classList.add('hidden');
  }, 300);
}

function openCategoryModal() { openCategoryDrawer(); }
function openCategoryDrawer() {
  openSidePanel('Add New Product Category', `
    <form onsubmit="event.preventDefault(); showToast('New Category Created Successfully!', 'success'); closeSidePanel();" class="space-y-4">
      <div>
        <label class="text-xs font-bold block mb-1">Category Name</label>
        <input type="text" placeholder="e.g. Organic Dairy & Milks" required class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500">
      </div>
      <div>
        <label class="text-xs font-bold block mb-1">Parent Category</label>
        <select class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none">
          <option>None (Top Level Category)</option>
          <option>Beverages & Juices</option>
          <option>Grocery & Pantry</option>
          <option>Confectionery & Snacks</option>
        </select>
      </div>
      <div>
        <label class="text-xs font-bold block mb-1">Default GST Tax Slab</label>
        <select class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none">
          <option>18% GST (Standard Retail)</option>
          <option>12% GST (Processed Foods)</option>
          <option>5% GST (Essential Groceries)</option>
          <option>28% GST (Luxury Items)</option>
        </select>
      </div>
      <div>
        <label class="text-xs font-bold block mb-1">Category Description</label>
        <textarea placeholder="Optional notes for catalog organization..." class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none h-24"></textarea>
      </div>
      <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
        <button type="button" onclick="closeSidePanel()" class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Cancel</button>
        <button type="submit" class="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-500/25">Create Category</button>
      </div>
    </form>
  `);
}

function openProductModal() { openProductDrawer(); }
function openProductDrawer() {
  openSidePanel('Add New Product SKU', `
    <form onsubmit="event.preventDefault(); showToast('New Product SKU Saved!', 'success'); closeSidePanel();" class="space-y-4">
      <div>
        <label class="text-xs font-bold block mb-1">Product Name</label>
        <input type="text" placeholder="e.g. Organic Almond Milk 1L" required class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none">
      </div>
      <div>
        <label class="text-xs font-bold block mb-1">SKU Code</label>
        <input type="text" value="SKU-8829" required class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono outline-none">
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="text-xs font-bold block mb-1">Cost Price (₹)</label>
          <input type="number" value="190" required class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none">
        </div>
        <div>
          <label class="text-xs font-bold block mb-1">Selling Price (₹)</label>
          <input type="number" value="249" required class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none">
        </div>
        <div>
          <label class="text-xs font-bold block mb-1">MRP (₹)</label>
          <input type="number" value="299" required class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none">
        </div>
      </div>
      <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
        <button type="button" onclick="closeSidePanel()" class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Cancel</button>
        <button type="submit" class="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-500/25">Save Product SKU</button>
      </div>
    </form>
  `);
}

function openCustomerModal() { openCustomerDrawer(); }
function openCustomerDrawer() {
  openSidePanel('Add New Customer Profile', `
    <form onsubmit="event.preventDefault(); showToast('Customer Profile Created!', 'success'); closeSidePanel();" class="space-y-4">
      <div>
        <label class="text-xs font-bold block mb-1">Customer Full Name</label>
        <input type="text" placeholder="e.g. Sarah Jenkins" required class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none">
      </div>
      <div>
        <label class="text-xs font-bold block mb-1">Phone Number</label>
        <input type="text" placeholder="+91 98201 44820" required class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none">
      </div>
      <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
        <button type="button" onclick="closeSidePanel()" class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Cancel</button>
        <button type="submit" class="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-500/25">Save Profile</button>
      </div>
    </form>
  `);
}

// Canvas Fallback Chart Renderer
function drawCanvasChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);

  const isDark = document.documentElement.classList.contains('dark');
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const values = [120000, 145000, 110000, 165000, 190000, 210000, 148920];
  const maxVal = 250000;

  const paddingLeft = 60;
  const paddingBottom = 40;
  const paddingTop = 30;
  const paddingRight = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {
    const y = paddingTop + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();

    const labelVal = `₹${Math.round(((4 - i) * (maxVal / 4)) / 1000)}k`;
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(labelVal, paddingLeft - 10, y + 3);
  }

  const barWidth = chartWidth / days.length - 20;

  days.forEach((day, idx) => {
    const x = paddingLeft + idx * (chartWidth / days.length) + 10;
    const barH = (values[idx] / maxVal) * chartHeight;
    const y = paddingTop + chartHeight - barH;

    const grad = ctx.createLinearGradient(0, y, 0, paddingTop + chartHeight);
    if (isDark) {
      grad.addColorStop(0, '#3b82f6');
      grad.addColorStop(1, 'rgba(59, 130, 246, 0.15)');
    } else {
      grad.addColorStop(0, '#2563eb');
      grad.addColorStop(1, 'rgba(37, 99, 235, 0.15)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barH, [6, 6, 0, 0]);
    ctx.fill();

    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '11px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(day, x + barWidth / 2, height - 15);
  });
}

// Chart Instances Repository
window.dashboardChartInstances = {};

function getChartTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    isDark,
    textColor: isDark ? '#94a3b8' : '#64748b',
    gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    tooltipBg: isDark ? '#0f172a' : '#ffffff',
    tooltipText: isDark ? '#f8fafc' : '#0f172a',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
}

function initIndexDashboardCharts(timeframe = '7d') {
  if (typeof Chart === 'undefined') {
    ['chart-sales-trend', 'chart-payment-split', 'chart-category-perf', 'chart-branch-comp', 'chart-peak-hours'].forEach(id => drawCanvasChart(id));
    return;
  }

  const theme = getChartTheme();

  // Clean up existing instances
  Object.keys(window.dashboardChartInstances).forEach(key => {
    if (window.dashboardChartInstances[key]) {
      window.dashboardChartInstances[key].destroy();
    }
  });

  const datasets = {
    today: {
      labels: ['6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'],
      revenue: [4200, 12800, 24500, 38900, 28400, 19200, 32100, 21800, 6800],
      profit: [1200, 3800, 7200, 11400, 8200, 5600, 9400, 6300, 1900],
      revTotal: '₹188,700.00',
      ordersTotal: '507 Bills',
      profitTotal: '₹54,900.00',
      aovTotal: '₹372.18'
    },
    '7d': {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      revenue: [120000, 145000, 110000, 165000, 190000, 210000, 148920],
      profit: [34000, 41000, 31000, 47000, 54000, 60000, 42590],
      revTotal: '₹148,920.00',
      ordersTotal: '412 Bills',
      profitTotal: '₹42,590.00',
      aovTotal: '₹361.45'
    },
    '30d': {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      revenue: [820000, 940000, 1050000, 983920],
      profit: [234000, 268000, 301000, 281000],
      revTotal: '₹3,793,920.00',
      ordersTotal: '10,380 Bills',
      profitTotal: '₹1,084,000.00',
      aovTotal: '₹365.50'
    },
    ytd: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      revenue: [3200000, 3450000, 3900000, 4100000, 4400000, 4850000, 5120000],
      profit: [910000, 980000, 1110000, 1170000, 1250000, 1380000, 1460000],
      revTotal: '₹29,020,000.00',
      ordersTotal: '80,300 Bills',
      profitTotal: '₹8,260,000.00',
      aovTotal: '₹361.39'
    }
  };

  const curr = datasets[timeframe] || datasets['7d'];

  const revEl = document.getElementById('metric-revenue');
  const ordEl = document.getElementById('metric-orders');
  const prfEl = document.getElementById('metric-profit');
  const aovEl = document.getElementById('metric-aov');
  if (revEl) revEl.innerText = curr.revTotal;
  if (ordEl) ordEl.innerText = curr.ordersTotal;
  if (prfEl) prfEl.innerText = curr.profitTotal;
  if (aovEl) aovEl.innerText = curr.aovTotal;

  // Chart 1: Sales & Net Profit Trend Line Area Chart
  const salesCanvas = document.getElementById('chart-sales-trend');
  if (salesCanvas) {
    const ctx = salesCanvas.getContext('2d');
    const grad1 = ctx.createLinearGradient(0, 0, 0, 320);
    grad1.addColorStop(0, 'rgba(37, 99, 235, 0.45)');
    grad1.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

    const grad2 = ctx.createLinearGradient(0, 0, 0, 320);
    grad2.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    grad2.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    window.dashboardChartInstances['salesTrend'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: curr.labels,
        datasets: [
          {
            label: 'Sales Revenue (₹)',
            data: curr.revenue,
            borderColor: '#2563eb',
            backgroundColor: grad1,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#2563eb',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8
          },
          {
            label: 'Net Profit (₹)',
            data: curr.profit,
            borderColor: '#10b981',
            backgroundColor: grad2,
            borderWidth: 2.5,
            borderDash: [4, 4],
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            borderColor: theme.borderColor,
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ₹${ctx.raw.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: theme.gridColor, drawBorder: false },
            ticks: { color: theme.textColor, font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
          },
          y: {
            grid: { color: theme.gridColor, drawBorder: false },
            ticks: {
              color: theme.textColor,
              font: { family: 'Plus Jakarta Sans', size: 11 },
              callback: v => '₹' + (v >= 100000 ? (v / 100000).toFixed(1) + 'L' : (v / 1000).toFixed(0) + 'k')
            }
          }
        }
      }
    });
  }

  // Chart 2: Payment Method Split Doughnut Chart
  const payCanvas = document.getElementById('chart-payment-split');
  if (payCanvas) {
    const ctx = payCanvas.getContext('2d');
    window.dashboardChartInstances['paymentSplit'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['UPI / QR Code', 'Credit/Debit Cards', 'Cash Payment', 'BNPL / Store Credit'],
        datasets: [{
          data: [48, 28, 16, 8],
          backgroundColor: ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '74%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            borderColor: theme.borderColor,
            borderWidth: 1,
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.raw}% share`
            }
          }
        }
      }
    });
  }

  // Chart 3: Category Performance Horizontal Bar Chart
  const catCanvas = document.getElementById('chart-category-perf');
  if (catCanvas) {
    const ctx = catCanvas.getContext('2d');
    window.dashboardChartInstances['categoryPerf'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Dairy & Milk', 'Chocolates', 'Gourmet Oils', 'Beverages', 'Bakery', 'Frozen Food'],
        datasets: [{
          label: 'Sales (₹)',
          data: [48200, 36400, 29800, 22100, 16500, 12900],
          backgroundColor: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` Sales Volume: ₹${ctx.raw.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: theme.gridColor },
            ticks: { color: theme.textColor, callback: v => '₹' + (v / 1000) + 'k' }
          },
          y: {
            grid: { display: false },
            ticks: { color: theme.textColor, font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
          }
        }
      }
    });
  }

  // Chart 4: Multi-Branch Comparison Bar Chart
  const branchCanvas = document.getElementById('chart-branch-comp');
  if (branchCanvas) {
    const ctx = branchCanvas.getContext('2d');
    window.dashboardChartInstances['branchComp'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Downtown', 'Suburban', 'Airport Kiosk'],
        datasets: [
          {
            label: 'Revenue (₹)',
            data: [78450, 46200, 24270],
            backgroundColor: '#2563eb',
            borderRadius: 6
          },
          {
            label: 'Orders',
            data: [210, 134, 68],
            backgroundColor: '#06b6d4',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: theme.textColor, font: { size: 10, weight: '600' }, boxWidth: 10 }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: theme.textColor, font: { size: 10 } } },
          y: { grid: { color: theme.gridColor }, ticks: { color: theme.textColor, font: { size: 10 } } }
        }
      }
    });
  }

  // Chart 5: Hourly Footfall Peak Bar Chart
  const hourlyCanvas = document.getElementById('chart-peak-hours');
  if (hourlyCanvas) {
    const ctx = hourlyCanvas.getContext('2d');
    window.dashboardChartInstances['peakHours'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM', '9 PM'],
        datasets: [{
          label: 'Bills Processed',
          data: [18, 45, 88, 52, 64, 95, 50],
          backgroundColor: [
            '#3b82f6', '#3b82f6', '#ef4444', '#3b82f6', '#f59e0b', '#ef4444', '#f59e0b'
          ],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: theme.textColor, font: { size: 10 } } },
          y: { grid: { color: theme.gridColor }, ticks: { color: theme.textColor, font: { size: 10 } } }
        }
      }
    });
  }
}

function setDashboardTimeframe(timeframe, btn) {
  document.querySelectorAll('.tf-btn').forEach(b => {
    b.className = 'tf-btn px-3 py-1.5 rounded-xl transition hover:text-blue-600 text-slate-500 dark:text-slate-400';
  });
  if (btn) {
    btn.className = 'tf-btn px-3 py-1.5 rounded-xl transition bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20';
  }
  initIndexDashboardCharts(timeframe);
  showToast(`Dashboard analytics updated for ${timeframe.toUpperCase()}`, 'info');
}

function refreshDashboardData(btn) {
  if (btn) {
    const icon = btn.querySelector('i');
    if (icon) icon.classList.add('animate-spin');
    setTimeout(() => {
      if (icon) icon.classList.remove('animate-spin');
    }, 800);
  }
  initIndexDashboardCharts('7d');
  showToast('Dashboard metrics re-synchronized with live server stream', 'success');
}

function exportDashboardReport() {
  showToast('Generating Executive Analytics PDF Report...', 'info');
  setTimeout(() => {
    showToast('Report downloaded successfully: ApexPOS_Executive_Report.pdf', 'success');
  }, 1200);
}

function filterTransactionsTable() {
  const input = document.getElementById('transaction-search');
  if (!input) return;
  const filter = input.value.toLowerCase();
  const rows = document.querySelectorAll('#live-transactions-body tr');

  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(filter) ? '' : 'none';
  });
}

function switchWidgetTab(tabName, btn) {
  document.querySelectorAll('.widget-tab-btn').forEach(b => {
    b.className = 'widget-tab-btn font-bold text-xs px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white';
  });
  if (btn) {
    btn.className = 'widget-tab-btn font-bold text-xs px-3 py-1.5 rounded-xl bg-blue-600 text-white shadow-sm';
  }

  const p1 = document.getElementById('widget-panel-top-skus');
  const p2 = document.getElementById('widget-panel-low-stock');

  if (tabName === 'top-skus') {
    if (p1) p1.classList.remove('hidden');
    if (p2) p2.classList.add('hidden');
  } else {
    if (p1) p1.classList.add('hidden');
    if (p2) p2.classList.remove('hidden');
  }
}

// ==========================================
// HELD & SUSPENDED BILLS QUEUE MANAGEMENT ENGINE
// ==========================================

let sampleHeldBills = [
  {
    id: 'HOLD-8821',
    customerName: 'Sarah Jenkins',
    customerType: 'VIP Member',
    cashier: 'Alexander Wright',
    terminal: 'Register #04',
    branch: 'Downtown Flagship',
    time: '12 mins ago',
    timestamp: '11:42 AM',
    reasonCategory: 'Pending Customer',
    reason: 'Customer went back to dairy section to pick up organic eggs.',
    items: [
      { name: 'Organic Almond Milk 1L', sku: 'SKU-8829', price: 249, qty: 2, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=150&auto=format&fit=crop&q=80' },
      { name: 'Artisan Dark Chocolate 85%', sku: 'SKU-4401', price: 180, qty: 1, image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=150&auto=format&fit=crop&q=80' },
      { name: 'Extra Virgin Olive Oil 500ml', sku: 'SKU-9921', price: 650, qty: 1, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150&auto=format&fit=crop&q=80' }
    ]
  },
  {
    id: 'HOLD-8820',
    customerName: 'Rahul Sharma',
    customerType: 'Walk-in Customer',
    cashier: 'Alexander Wright',
    terminal: 'Register #02',
    branch: 'Downtown Flagship',
    time: '24 mins ago',
    timestamp: '11:30 AM',
    reasonCategory: 'Price Verification',
    reason: 'Awaiting price verification from supervisor on bulk cashew nuts.',
    items: [
      { name: 'Roasted Almonds & Cashews 250g', sku: 'SKU-7721', price: 340, qty: 3, image: 'https://images.unsplash.com/photo-1508737027454-e6454ef45afd?w=150&auto=format&fit=crop&q=80' },
      { name: 'Fresh Green Apple Pack (4pcs)', sku: 'SKU-5529', price: 190, qty: 2, image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=150&auto=format&fit=crop&q=80' }
    ]
  },
  {
    id: 'HOLD-8819',
    customerName: 'Priya Patel',
    customerType: 'B2B Wholesale',
    cashier: 'Elena Rostova',
    terminal: 'Register #01',
    branch: 'Downtown Flagship',
    time: '31 mins ago',
    timestamp: '11:23 AM',
    reasonCategory: 'Draft Orders',
    reason: 'Wholesale client requested draft quotation review before payment approval.',
    items: [
      { name: 'Basmati Rice Super 5kg', sku: 'SKU-1029', price: 890, qty: 5, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150&auto=format&fit=crop&q=80' },
      { name: 'Refined Sunflower Oil 2L', sku: 'SKU-2091', price: 320, qty: 6, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150&auto=format&fit=crop&q=80' }
    ]
  },
  {
    id: 'HOLD-8818',
    customerName: 'Vikram Singh',
    customerType: 'VIP Member',
    cashier: 'Alexander Wright',
    terminal: 'Register #04',
    branch: 'Downtown Flagship',
    time: '42 mins ago',
    timestamp: '11:12 AM',
    reasonCategory: 'Pending Customer',
    reason: 'Customer requested card pin reset at nearby ATM counter.',
    items: [
      { name: 'Sparkling Mineral Water 750ml', sku: 'SKU-3012', price: 160, qty: 4, image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=150&auto=format&fit=crop&q=80' },
      { name: 'Greek Yogurt Blueberry 200g', sku: 'SKU-6120', price: 95, qty: 3, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=150&auto=format&fit=crop&q=80' }
    ]
  },
  {
    id: 'HOLD-8817',
    customerName: 'Ananya Verma',
    customerType: 'Walk-in Customer',
    cashier: 'Rajesh Kumar',
    terminal: 'Register #03',
    branch: 'Downtown Flagship',
    time: '58 mins ago',
    timestamp: '10:56 AM',
    reasonCategory: 'Draft Orders',
    reason: 'Customer wanted to double check coupons before finalizing order.',
    items: [
      { name: 'Organic Honey Wildflower 500g', sku: 'SKU-8192', price: 420, qty: 2, image: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=150&auto=format&fit=crop&q=80' }
    ]
  }
];

let selectedHeldBillId = 'HOLD-8821';
let activeHeldCategoryFilter = 'all';

function renderHoldSuspendPage() {
  const container = document.getElementById('held-bills-list-container');
  if (!container) return;

  const searchQuery = (document.getElementById('search-held-bills')?.value || '').toLowerCase().trim();

  // Filter bills
  const filtered = sampleHeldBills.filter(bill => {
    const matchesSearch = 
      bill.id.toLowerCase().includes(searchQuery) ||
      bill.customerName.toLowerCase().includes(searchQuery) ||
      bill.cashier.toLowerCase().includes(searchQuery) ||
      bill.reason.toLowerCase().includes(searchQuery);

    const matchesCategory = 
      activeHeldCategoryFilter === 'all' || 
      bill.reasonCategory === activeHeldCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Calculate totals for KPIs
  let grandTotalValue = 0;
  sampleHeldBills.forEach(b => {
    const bSub = b.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
    grandTotalValue += bSub * 1.18; // approx incl GST
  });

  const kpiVal = document.getElementById('kpi-held-total-value');
  const kpiCount = document.getElementById('kpi-held-count');
  const badge = document.getElementById('held-queue-count-badge');

  if (kpiVal) kpiVal.innerText = `₹${grandTotalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (kpiCount) kpiCount.innerText = `${sampleHeldBills.length} Carts`;
  if (badge) badge.innerText = `${sampleHeldBills.length} Active Suspensions`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="glass-card p-8 rounded-3xl text-center space-y-3">
        <i data-lucide="check-circle-2" class="w-10 h-10 text-emerald-500 mx-auto"></i>
        <h4 class="font-bold text-sm text-slate-800 dark:text-slate-200">No Held Bills Found</h4>
        <p class="text-xs text-slate-400">All suspended checkout queues are clear or match no search query.</p>
      </div>
    `;
    renderHeldBillDetails(null);
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // Ensure valid selection
  if (!filtered.some(b => b.id === selectedHeldBillId)) {
    selectedHeldBillId = filtered[0].id;
  }

  // Render Left Column Cards
  container.innerHTML = filtered.map(bill => {
    const isSelected = bill.id === selectedHeldBillId;
    const itemsCount = bill.items.reduce((acc, item) => acc + item.qty, 0);
    const subtotal = bill.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    let catBadgeColor = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    if (bill.reasonCategory === 'Price Verification') catBadgeColor = 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    if (bill.reasonCategory === 'Draft Orders') catBadgeColor = 'bg-blue-500/10 text-blue-600 border-blue-500/20';

    return `
      <div onclick="selectHeldBill('${bill.id}')" class="p-4 rounded-2xl transition cursor-pointer border ${isSelected ? 'bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-500/30' : 'glass-card border-slate-200/80 dark:border-slate-800 hover:border-amber-400/50'}">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-mono font-black text-xs text-slate-900 dark:text-white">${bill.id}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${catBadgeColor}">${bill.reasonCategory}</span>
          </div>
          <span class="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
            <i data-lucide="clock" class="w-3 h-3"></i> ${bill.time}
          </span>
        </div>

        <div class="mt-2.5 flex items-center justify-between">
          <div>
            <h4 class="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <i data-lucide="user" class="w-3.5 h-3.5 text-amber-500"></i> ${bill.customerName}
            </h4>
            <p class="text-[10px] text-slate-400 mt-0.5">${itemsCount} items (${bill.items.length} SKUs) | ${bill.terminal}</p>
          </div>
          <div class="text-right">
            <div class="font-black text-sm text-slate-900 dark:text-white">₹${total.toFixed(2)}</div>
            <div class="text-[10px] text-slate-400">${bill.cashier}</div>
          </div>
        </div>

        <div class="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
          <span class="text-slate-500 dark:text-slate-400 truncate max-w-[240px]">"${bill.reason}"</span>
          <button onclick="recallHeldBillToPOS('${bill.id}'); event.stopPropagation();" class="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] shadow-sm flex items-center gap-1">
            <i data-lucide="corner-up-right" class="w-3 h-3"></i> Recall
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Render Right Column Details
  const selectedObj = sampleHeldBills.find(b => b.id === selectedHeldBillId);
  renderHeldBillDetails(selectedObj);

  if (window.lucide) window.lucide.createIcons();
}

function selectHeldBill(id) {
  selectedHeldBillId = id;
  renderHoldSuspendPage();
}

function filterHeldCategory(category, btn) {
  activeHeldCategoryFilter = category;

  document.querySelectorAll('.hold-cat-btn').forEach(b => {
    b.classList.remove('bg-amber-500', 'text-white', 'shadow-md', 'font-bold');
    b.classList.add('text-slate-600', 'dark:text-slate-400');
  });

  if (btn) {
    btn.classList.add('bg-amber-500', 'text-white', 'shadow-md', 'font-bold');
    btn.classList.remove('text-slate-600', 'dark:text-slate-400');
  }

  renderHoldSuspendPage();
}

function filterHeldBills() {
  renderHoldSuspendPage();
}

function renderHeldBillDetails(bill) {
  const panel = document.getElementById('held-bill-detail-panel');
  if (!panel) return;

  if (!bill) {
    panel.innerHTML = `
      <div class="text-center py-20 space-y-3">
        <i data-lucide="inbox" class="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto"></i>
        <h3 class="font-bold text-sm text-slate-500">Select a held bill card to inspect order details</h3>
      </div>
    `;
    return;
  }

  const subtotal = bill.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  panel.innerHTML = `
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-black text-slate-900 dark:text-white tracking-tight">${bill.id}</h2>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wider">Suspended Cart</span>
        </div>
        <p class="text-xs text-slate-400 mt-1">Suspended at ${bill.timestamp} (${bill.time}) by ${bill.cashier} | ${bill.terminal}</p>
      </div>

      <div class="flex items-center gap-2">
        <button onclick="voidHeldBill('${bill.id}')" class="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs transition border border-red-500/20 flex items-center gap-1">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Void
        </button>
        <button onclick="recallHeldBillToPOS('${bill.id}')" class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs shadow-lg shadow-amber-500/25 transition transform hover:scale-[1.02] flex items-center gap-1.5">
          <i data-lucide="zap" class="w-4 h-4"></i> Recall & Checkout
        </button>
      </div>
    </div>

    <!-- Customer & Branch Banner -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
        <div class="text-[10px] font-extrabold uppercase text-slate-400">Customer Details</div>
        <div class="flex items-center justify-between">
          <span class="font-extrabold text-xs text-slate-900 dark:text-white">${bill.customerName}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600">${bill.customerType}</span>
        </div>
        <div class="text-[11px] text-slate-400">Loyalty Tier: VIP Gold (1,420 pts)</div>
      </div>

      <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
        <div class="text-[10px] font-extrabold uppercase text-slate-400">Terminal & Reason</div>
        <div class="flex items-center justify-between">
          <span class="font-bold text-xs text-slate-800 dark:text-slate-200">${bill.branch} (${bill.terminal})</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600">${bill.reasonCategory}</span>
        </div>
        <div class="text-[11px] text-slate-400 italic">"${bill.reason}"</div>
      </div>
    </div>

    <!-- Line Items Table -->
    <div class="space-y-3">
      <div class="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
        <span>Cart Items (${bill.items.length} SKUs)</span>
        <span class="text-slate-400 text-[11px]">GST 18% Applicable</span>
      </div>

      <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-100/70 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400">
              <th class="py-2.5 px-3">Item Details</th>
              <th class="py-2.5 px-3 text-center">Qty</th>
              <th class="py-2.5 px-3 text-right">Unit Price</th>
              <th class="py-2.5 px-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
            ${bill.items.map(item => `
              <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td class="py-3 px-3">
                  <div class="flex items-center gap-3">
                    <img src="${item.image}" class="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-800">
                    <div>
                      <div class="font-bold text-xs text-slate-800 dark:text-slate-100">${item.name}</div>
                      <div class="text-[10px] text-slate-400 font-mono">${item.sku}</div>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">x${item.qty}</td>
                <td class="py-3 px-3 text-right text-slate-600 dark:text-slate-400 font-mono">₹${item.price.toFixed(2)}</td>
                <td class="py-3 px-3 text-right font-black text-slate-900 dark:text-white">₹${(item.price * item.qty).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Financial Breakdown Box -->
    <div class="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
      <div class="flex justify-between text-slate-500 dark:text-slate-400">
        <span>Cart Subtotal</span>
        <span class="font-mono">₹${subtotal.toFixed(2)}</span>
      </div>
      <div class="flex justify-between text-slate-500 dark:text-slate-400">
        <span>Estimated GST (18%)</span>
        <span class="font-mono">₹${tax.toFixed(2)}</span>
      </div>
      <div class="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
        <span class="font-bold text-sm text-slate-900 dark:text-white">Total Amount Due</span>
        <span class="font-black text-lg text-amber-500">₹${total.toFixed(2)}</span>
      </div>
    </div>
  `;
}

function recallHeldBillToPOS(id) {
  const bill = sampleHeldBills.find(b => b.id === id);
  if (!bill) return;

  // Load into active cart
  cart = bill.items.map(item => ({
    id: item.sku,
    title: item.name,
    sku: item.sku,
    price: item.price,
    qty: item.qty,
    taxRate: 18,
    image: item.image
  }));

  // Remove from sample array
  sampleHeldBills = sampleHeldBills.filter(b => b.id !== id);

  showToast(`Bill #${id} recalled into POS cart!`, 'success');

  // Redirect to pos-touch.html after 300ms
  setTimeout(() => {
    window.location.href = 'pos-touch.html';
  }, 300);
}

function voidHeldBill(id) {
  if (confirm(`Are you sure you want to void and remove held bill #${id}?`)) {
    sampleHeldBills = sampleHeldBills.filter(b => b.id !== id);
    showToast(`Held bill #${id} has been voided.`, 'warning');
    renderHoldSuspendPage();
  }
}

function openNewHoldModal() {
  showToast('Creating new hold note template...', 'info');
}

// ==========================================
// ENTERPRISE INVENTORY CATALOG MANAGEMENT ENGINE
// ==========================================

let activeInventoryViewMode = 'table'; // 'table' or 'grid'

function renderInventoryProductsPage() {
  const container = document.getElementById('inventory-products-view-container');
  if (!container) return;

  const searchQuery = (document.getElementById('inventory-search-input')?.value || '').toLowerCase().trim();
  const categoryFilter = document.getElementById('inventory-cat-filter')?.value || 'all';
  const statusFilter = document.getElementById('inventory-status-filter')?.value || 'all';

  // Filter dataset
  const filtered = sampleProducts.filter(item => {
    const titleStr = (item.title || item.name || '');
    const matchesSearch = 
      titleStr.toLowerCase().includes(searchQuery) ||
      item.sku.toLowerCase().includes(searchQuery) ||
      item.category.toLowerCase().includes(searchQuery);

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === 'in_stock') matchesStatus = item.stock > 15;
    if (statusFilter === 'low_stock') matchesStatus = item.stock > 0 && item.stock <= 15;
    if (statusFilter === 'out_stock') matchesStatus = item.stock === 0;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate KPIs
  let totalValuation = 0;
  let lowStockCount = 0;
  let outStockCount = 0;

  sampleProducts.forEach(p => {
    totalValuation += p.price * p.stock;
    if (p.stock === 0) outStockCount++;
    else if (p.stock <= (p.minStock || 15)) lowStockCount++;
  });

  const kpiSkus = document.getElementById('inv-kpi-total-skus');
  const kpiVal = document.getElementById('inv-kpi-total-value');
  const kpiLow = document.getElementById('inv-kpi-low-stock');
  const kpiOut = document.getElementById('inv-kpi-out-stock');
  const skuBadge = document.getElementById('inv-total-sku-badge');

  if (kpiSkus) kpiSkus.innerText = `${sampleProducts.length} SKUs`;
  if (kpiVal) kpiVal.innerText = `₹${totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (kpiLow) kpiLow.innerText = `${lowStockCount} SKUs`;
  if (kpiOut) kpiOut.innerText = `${outStockCount} SKU`;
  if (skuBadge) skuBadge.innerText = `${sampleProducts.length} Active SKUs`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="glass-card p-12 rounded-3xl text-center space-y-3 border border-slate-200/80 dark:border-slate-800">
        <i data-lucide="package-x" class="w-12 h-12 text-slate-400 mx-auto"></i>
        <h4 class="font-bold text-base text-slate-800 dark:text-slate-200">No Products Found</h4>
        <p class="text-xs text-slate-400">No SKUs in catalog match the current search or status filter criteria.</p>
        <button onclick="resetInventoryFilters()" class="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-md">Reset Filters</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  if (activeInventoryViewMode === 'table') {
    // Render Table View
    container.innerHTML = `
      <div class="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-lg">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th class="py-3 px-4 w-10 text-center"><input type="checkbox" onchange="toggleSelectAllInventory(this)" class="rounded text-purple-600"></th>
                <th class="py-3 px-4">Product Info & SKU</th>
                <th class="py-3 px-4">Category</th>
                <th class="py-3 px-4 text-right">Cost Price</th>
                <th class="py-3 px-4 text-right">Selling Price</th>
                <th class="py-3 px-4 text-center">Profit Margin</th>
                <th class="py-3 px-4 text-center">Stock Level</th>
                <th class="py-3 px-4 text-center">GST Tax</th>
                <th class="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              ${filtered.map(item => {
                const itemTitle = item.title || item.name || 'Product';
                const cost = item.costPrice || (item.price * 0.72);
                const margin = (((item.price - cost) / item.price) * 100).toFixed(1);
                const minThreshold = item.minStock || 15;

                let statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">${item.stock} in stock</span>`;
                if (item.stock === 0) {
                  statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600 border border-rose-500/20">Out of Stock</span>`;
                } else if (item.stock <= minThreshold) {
                  statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20">${item.stock} low stock</span>`;
                }

                return `
                  <tr class="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition">
                    <td class="py-3 px-4 text-center"><input type="checkbox" class="inv-row-checkbox rounded text-purple-600"></td>
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        <img src="${item.image}" class="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div>
                          <div class="font-bold text-xs text-slate-900 dark:text-white">${itemTitle}</div>
                          <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span>${item.sku}</span>
                            <span>•</span>
                            <span>BAR: ${item.barcode || '890128392102'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-4">
                      <span class="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px] border border-purple-500/20">${item.category}</span>
                    </td>
                    <td class="py-3 px-4 text-right text-slate-500 font-mono">₹${cost.toFixed(2)}</td>
                    <td class="py-3 px-4 text-right font-black text-slate-900 dark:text-white font-mono">₹${item.price.toFixed(2)}</td>
                    <td class="py-3 px-4 text-center font-bold text-emerald-600 text-[11px]">+${margin}%</td>
                    <td class="py-3 px-4 text-center">${statusBadge}</td>
                    <td class="py-3 px-4 text-center font-bold text-slate-600 dark:text-slate-300">${item.taxRate || 18}%</td>
                    <td class="py-3 px-4 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        <button onclick="editProductBySKU('${item.sku}')" title="Edit Product" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                          <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="printProductBarcode('${item.sku}')" title="Print Barcode Label" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                          <i data-lucide="barcode" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="deleteInventoryProduct('${item.sku}')" title="Delete Product" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    // Render Grid View
    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        ${filtered.map(item => {
          const itemTitle = item.title || item.name || 'Product';
          const cost = item.costPrice || (item.price * 0.72);
          const margin = (((item.price - cost) / item.price) * 100).toFixed(1);
          const minThreshold = item.minStock || 15;

          let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600">${item.stock} in stock</span>`;
          if (item.stock === 0) {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600">Out of Stock</span>`;
          } else if (item.stock <= minThreshold) {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600">${item.stock} low stock</span>`;
          }

          return `
            <div class="glass-card p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-3 hover:border-purple-500/50 transition duration-300 group">
              <div class="relative w-full h-40 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900">
                <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                <div class="absolute top-2 left-2 flex items-center gap-1">
                  <span class="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">${item.category}</span>
                </div>
                <div class="absolute top-2 right-2">
                  ${statusBadge}
                </div>
              </div>

              <div>
                <h4 class="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">${itemTitle}</h4>
                <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>${item.sku}</span>
                  <span class="text-emerald-600 font-bold">+${margin}% Margin</span>
                </div>
              </div>

              <div class="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div class="text-[10px] text-slate-400">Selling Price</div>
                  <div class="font-black text-sm text-slate-900 dark:text-white">₹${item.price.toFixed(2)}</div>
                </div>
                <div class="flex items-center gap-1">
                  <button onclick="editProductBySKU('${item.sku}')" class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                  </button>
                  <button onclick="printProductBarcode('${item.sku}')" class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                    <i data-lucide="barcode" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  if (window.lucide) window.lucide.createIcons();
}

function filterInventoryCatalog() {
  renderInventoryProductsPage();
}

function resetInventoryFilters() {
  const input = document.getElementById('inventory-search-input');
  const cat = document.getElementById('inventory-cat-filter');
  const status = document.getElementById('inventory-status-filter');

  if (input) input.value = '';
  if (cat) cat.value = 'all';
  if (status) status.value = 'all';

  renderInventoryProductsPage();
}

function toggleInventoryView(mode) {
  activeInventoryViewMode = mode;

  const btnTable = document.getElementById('btn-view-table');
  const btnGrid = document.getElementById('btn-view-grid');

  if (mode === 'table') {
    if (btnTable) btnTable.className = 'p-1.5 rounded-xl bg-purple-600 text-white font-bold shadow-sm transition';
    if (btnGrid) btnGrid.className = 'p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-purple-600 transition';
  } else {
    if (btnGrid) btnGrid.className = 'p-1.5 rounded-xl bg-purple-600 text-white font-bold shadow-sm transition';
    if (btnTable) btnTable.className = 'p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-purple-600 transition';
  }

  renderInventoryProductsPage();
}

function openAddProductModal() {
  const drawer = document.getElementById('product-modal-drawer');
  const form = document.getElementById('product-modal-form');
  const title = document.getElementById('modal-product-title');
  const indexInput = document.getElementById('form-product-edit-index');

  if (form) form.reset();
  if (indexInput) indexInput.value = '-1';
  if (title) title.innerText = 'Add New Product SKU';
  if (drawer) drawer.classList.remove('hidden');
}

function closeAddProductModal() {
  const drawer = document.getElementById('product-modal-drawer');
  if (drawer) drawer.classList.add('hidden');
}

function saveProductFromModal(event) {
  event.preventDefault();

  const title = document.getElementById('form-product-title').value;
  const sku = document.getElementById('form-product-sku').value;
  const barcode = document.getElementById('form-product-barcode').value || '8901293849102';
  const category = document.getElementById('form-product-category').value;
  const tax = parseFloat(document.getElementById('form-product-tax').value) || 18;
  const price = parseFloat(document.getElementById('form-product-price').value) || 0;
  const cost = parseFloat(document.getElementById('form-product-cost').value) || (price * 0.72);
  const stock = parseInt(document.getElementById('form-product-stock').value) || 0;
  const minStock = parseInt(document.getElementById('form-product-min-stock').value) || 15;
  const image = document.getElementById('form-product-image').value || 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=150&auto=format&fit=crop&q=80';

  const editIndex = parseInt(document.getElementById('form-product-edit-index').value);

  if (editIndex >= 0 && editIndex < sampleProducts.length) {
    sampleProducts[editIndex] = {
      ...sampleProducts[editIndex],
      title, name: title, sku, barcode, category, taxRate: tax, price, costPrice: cost, stock, minStock, image
    };
    showToast(`Updated product ${sku} successfully!`, 'success');
  } else {
    sampleProducts.unshift({
      id: sku,
      title, name: title, sku, barcode, category, taxRate: tax, price, costPrice: cost, stock, minStock, image
    });
    showToast(`Created new product SKU ${sku}!`, 'success');
  }

  closeAddProductModal();
  renderInventoryProductsPage();
  renderProductGrid(); // Sync POS terminal catalog grid
}

function editProductBySKU(sku) {
  const index = sampleProducts.findIndex(p => p.sku === sku);
  if (index === -1) return;

  const item = sampleProducts[index];

  openAddProductModal();

  document.getElementById('modal-product-title').innerText = `Edit Product: ${item.sku}`;
  document.getElementById('form-product-edit-index').value = index;

  document.getElementById('form-product-title').value = item.title || item.name || '';
  document.getElementById('form-product-sku').value = item.sku;
  document.getElementById('form-product-barcode').value = item.barcode || '8901293849102';
  document.getElementById('form-product-category').value = item.category;
  document.getElementById('form-product-tax').value = item.taxRate || 18;
  document.getElementById('form-product-price').value = item.price;
  document.getElementById('form-product-cost').value = item.costPrice || (item.price * 0.72);
  document.getElementById('form-product-stock').value = item.stock;
  document.getElementById('form-product-min-stock').value = item.minStock || 15;
  document.getElementById('form-product-image').value = item.image;
}

function deleteInventoryProduct(sku) {
  if (confirm(`Are you sure you want to delete SKU ${sku} from catalog?`)) {
    sampleProducts = sampleProducts.filter(p => p.sku !== sku);
    showToast(`Deleted SKU ${sku} from catalog.`, 'warning');
    renderInventoryProductsPage();
    renderProductGrid();
  }
}

function printProductBarcode(sku) {
  const item = sampleProducts.find(p => p.sku === sku);
  if (!item) return;

  const modal = document.getElementById('barcode-modal');
  const body = document.getElementById('barcode-modal-body');

  if (modal && body) {
    body.innerHTML = `
      <div class="space-y-3 p-4 bg-white rounded-2xl border border-slate-200">
        <div class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">ApexPOS Barcode Label</div>
        <div class="font-black text-sm text-slate-900">${item.title || item.name}</div>
        <div class="font-mono text-xs text-slate-500 font-bold">MRP: ₹${item.price.toFixed(2)} (Incl GST)</div>
        
        <!-- Simulated Barcode Lines -->
        <div class="py-3 px-6 bg-slate-50 rounded-xl flex flex-col items-center justify-center space-y-1 border border-slate-100">
          <div class="h-12 w-48 bg-slate-900 flex items-center justify-between px-2 text-white font-mono text-[8px] overflow-hidden tracking-tighter" style="background: repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px);">
          </div>
          <span class="font-mono text-xs font-bold text-slate-800 tracking-widest">${item.barcode || '890128392102'}</span>
        </div>

        <div class="text-[10px] text-slate-400 font-mono">${item.sku} | ${item.category}</div>
      </div>
    `;
    modal.classList.remove('hidden');
  }
}

function closeBarcodeModal() {
  const modal = document.getElementById('barcode-modal');
  if (modal) modal.classList.add('hidden');
}

function exportInventoryCSV() {
  showToast('Exporting inventory catalog to CSV file...', 'info');
}

function toggleSelectAllInventory(master) {
  document.querySelectorAll('.inv-row-checkbox').forEach(cb => cb.checked = master.checked);
}

// ==========================================
// CATEGORIES & BRANDS TAXONOMY MANAGEMENT ENGINE
// ==========================================

let sampleCategories = [
  {
    name: 'Dairy & Milk',
    slug: 'dairy-milk',
    taxRate: 18,
    skusCount: 2,
    revenue: 35358,
    description: 'Fresh organic milk, almond milk, artisanal cheeses, and cultured butter.',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'Confectionery',
    slug: 'confectionery',
    taxRate: 18,
    skusCount: 2,
    revenue: 17640,
    description: 'Artisan dark chocolate, premium truffles, and gourmet candies.',
    image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'Gourmet & Oils',
    slug: 'gourmet-oils',
    taxRate: 18,
    skusCount: 2,
    revenue: 41600,
    description: 'Cold-pressed extra virgin olive oil, truffle oil, and specialty condiments.',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'Beverages',
    slug: 'beverages',
    taxRate: 18,
    skusCount: 2,
    revenue: 24500,
    description: 'Sparkling mineral water, cold brew coffee, and kombucha infusions.',
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'Bakery & Nuts',
    slug: 'bakery-nuts',
    taxRate: 12,
    skusCount: 2,
    revenue: 18400,
    description: 'Slow-roasted almonds, cashews, sourdough loaves, and gluten-free pastries.',
    image: 'https://images.unsplash.com/photo-1508737027454-e6454ef45afd?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'Fresh Goods',
    slug: 'fresh-goods',
    taxRate: 5,
    skusCount: 2,
    revenue: 11420,
    description: 'Farm-fresh organic apples, avocados, berries, and leafy greens.',
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=150&auto=format&fit=crop&q=80'
  }
];

let sampleBrands = [
  { name: 'Amul Dairy', country: 'India', skusCount: 3, categories: 'Dairy & Milk, Butter', status: 'Verified' },
  { name: 'Nestle International', country: 'Switzerland', skusCount: 4, categories: 'Confectionery, Beverages', status: 'Verified' },
  { name: 'Borges Gourmet', country: 'Spain', skusCount: 2, categories: 'Gourmet & Oils', status: 'Verified' },
  { name: 'Ferrero Rocher', country: 'Italy', skusCount: 3, categories: 'Confectionery', status: 'Verified' },
  { name: 'Tropicana Organics', country: 'USA', skusCount: 2, categories: 'Beverages, Juices', status: 'Verified' },
  { name: 'Britannia Industries', country: 'India', skusCount: 4, categories: 'Bakery & Nuts, Biscuits', status: 'Verified' }
];

let activeCategoryTab = 'categories'; // 'categories' or 'brands'

function renderCategoriesAndBrandsPage() {
  const panel = document.getElementById('cat-brand-directory-panel');
  if (!panel) return;

  const searchQuery = (document.getElementById('search-cat-brand-input')?.value || '').toLowerCase().trim();

  // Update badge & KPIs
  const kpiCat = document.getElementById('kpi-cat-count');
  const kpiBrand = document.getElementById('kpi-brand-count');
  const badge = document.getElementById('cat-total-count-badge');

  if (kpiCat) kpiCat.innerText = `${sampleCategories.length} Active`;
  if (kpiBrand) kpiBrand.innerText = `${sampleBrands.length} Brands`;
  if (badge) badge.innerText = `${sampleCategories.length} Categories • ${sampleBrands.length} Brands`;

  if (activeCategoryTab === 'categories') {
    // Filter Categories
    const filteredCats = sampleCategories.filter(c => 
      c.name.toLowerCase().includes(searchQuery) || 
      c.description.toLowerCase().includes(searchQuery)
    );

    if (filteredCats.length === 0) {
      panel.innerHTML = `
        <div class="glass-card p-12 rounded-3xl text-center space-y-3 border border-slate-200/80 dark:border-slate-800">
          <i data-lucide="tag" class="w-12 h-12 text-slate-400 mx-auto"></i>
          <h4 class="font-bold text-base text-slate-800 dark:text-slate-200">No Categories Found</h4>
          <p class="text-xs text-slate-400">No category names match your search term.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    panel.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${filteredCats.map((cat, idx) => `
          <div class="glass-card p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-cyan-500/50 transition duration-300 group">
            <div class="flex items-start gap-4">
              <img src="${cat.image}" class="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-md group-hover:scale-105 transition">
              <div class="space-y-1 flex-1">
                <div class="flex items-center justify-between">
                  <h4 class="font-black text-sm text-slate-900 dark:text-white">${cat.name}</h4>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">GST ${cat.taxRate}%</span>
                </div>
                <p class="text-[11px] text-slate-400 line-clamp-2">${cat.description}</p>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
              <div>
                <span class="text-[10px] text-slate-400 font-semibold uppercase">Total Revenue</span>
                <div class="font-extrabold text-slate-900 dark:text-white">₹${cat.revenue.toLocaleString('en-IN')}</div>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-slate-400 font-semibold uppercase">Mapped SKUs</span>
                <div class="font-extrabold text-cyan-600">${cat.skusCount} SKUs</div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-1">
              <button onclick="editCategoryIndex(${idx})" class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit
              </button>
              <button onclick="deleteCategoryIndex(${idx})" class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    // Filter Brands
    const filteredBrands = sampleBrands.filter(b => 
      b.name.toLowerCase().includes(searchQuery) || 
      b.country.toLowerCase().includes(searchQuery) ||
      b.categories.toLowerCase().includes(searchQuery)
    );

    if (filteredBrands.length === 0) {
      panel.innerHTML = `
        <div class="glass-card p-12 rounded-3xl text-center space-y-3 border border-slate-200/80 dark:border-slate-800">
          <i data-lucide="award" class="w-12 h-12 text-slate-400 mx-auto"></i>
          <h4 class="font-bold text-base text-slate-800 dark:text-slate-200">No Brands Found</h4>
          <p class="text-xs text-slate-400">No brand names match your search query.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    panel.innerHTML = `
      <div class="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-lg">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th class="py-3.5 px-4">Brand Name & Vendor</th>
                <th class="py-3.5 px-4">Origin Country</th>
                <th class="py-3.5 px-4">Mapped Categories</th>
                <th class="py-3.5 px-4 text-center">Active SKUs</th>
                <th class="py-3.5 px-4 text-center">Status</th>
                <th class="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              ${filteredBrands.map((b, idx) => `
                <tr class="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition">
                  <td class="py-3.5 px-4 font-black text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-md">
                      ${b.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span>${b.name}</span>
                  </td>
                  <td class="py-3.5 px-4 text-slate-500 font-semibold">${b.country}</td>
                  <td class="py-3.5 px-4">
                    <span class="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px] border border-purple-500/20">${b.categories}</span>
                  </td>
                  <td class="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">${b.skusCount} SKUs</td>
                  <td class="py-3.5 px-4 text-center">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Verified</span>
                  </td>
                  <td class="py-3.5 px-4 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      <button onclick="editBrandIndex(${idx})" title="Edit Brand" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="deleteBrandIndex(${idx})" title="Delete Brand" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  if (window.lucide) window.lucide.createIcons();
}

function switchCategoryTab(tab, btn) {
  activeCategoryTab = tab;

  document.querySelectorAll('.cat-tab-btn').forEach(b => {
    b.classList.remove('bg-cyan-600', 'text-white', 'shadow-md', 'shadow-cyan-500/20', 'font-bold');
    b.classList.add('text-slate-500', 'dark:text-slate-400');
  });

  if (btn) {
    btn.classList.add('bg-cyan-600', 'text-white', 'shadow-md', 'shadow-cyan-500/20', 'font-bold');
    btn.classList.remove('text-slate-500', 'dark:text-slate-400');
  }

  renderCategoriesAndBrandsPage();
}

function filterCategoriesAndBrands() {
  renderCategoriesAndBrandsPage();
}

function openCategoryModal() {
  const drawer = document.getElementById('category-modal-drawer');
  const form = document.getElementById('category-modal-form');
  const indexInput = document.getElementById('form-cat-edit-index');

  if (form) form.reset();
  if (indexInput) indexInput.value = '-1';
  if (drawer) drawer.classList.remove('hidden');
}

function closeCategoryModal() {
  const drawer = document.getElementById('category-modal-drawer');
  if (drawer) drawer.classList.add('hidden');
}

function saveCategoryFromModal(event) {
  event.preventDefault();

  const name = document.getElementById('form-cat-name').value;
  const taxRate = parseFloat(document.getElementById('form-cat-tax').value) || 18;
  const description = document.getElementById('form-cat-desc').value || 'Product category';
  const image = document.getElementById('form-cat-image').value || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=150&auto=format&fit=crop&q=80';

  const editIndex = parseInt(document.getElementById('form-cat-edit-index').value);

  if (editIndex >= 0 && editIndex < sampleCategories.length) {
    sampleCategories[editIndex] = { ...sampleCategories[editIndex], name, taxRate, description, image };
    showToast(`Updated category "${name}"!`, 'success');
  } else {
    sampleCategories.unshift({ name, slug: name.toLowerCase().replace(/\s+/g, '-'), taxRate, skusCount: 0, revenue: 0, description, image });
    showToast(`Created new category "${name}"!`, 'success');
  }

  closeCategoryModal();
  renderCategoriesAndBrandsPage();
}

function editCategoryIndex(idx) {
  if (idx < 0 || idx >= sampleCategories.length) return;
  const cat = sampleCategories[idx];

  openCategoryModal();

  document.getElementById('modal-cat-title').innerText = `Edit Category: ${cat.name}`;
  document.getElementById('form-cat-edit-index').value = idx;
  document.getElementById('form-cat-name').value = cat.name;
  document.getElementById('form-cat-tax').value = cat.taxRate || 18;
  document.getElementById('form-cat-desc').value = cat.description;
  document.getElementById('form-cat-image').value = cat.image;
}

function deleteCategoryIndex(idx) {
  if (confirm(`Are you sure you want to delete category "${sampleCategories[idx].name}"?`)) {
    const name = sampleCategories[idx].name;
    sampleCategories.splice(idx, 1);
    showToast(`Deleted category "${name}".`, 'warning');
    renderCategoriesAndBrandsPage();
  }
}

function openBrandModal() {
  const drawer = document.getElementById('brand-modal-drawer');
  const form = document.getElementById('brand-modal-form');
  const indexInput = document.getElementById('form-brand-edit-index');

  if (form) form.reset();
  if (indexInput) indexInput.value = '-1';
  if (drawer) drawer.classList.remove('hidden');
}

function closeBrandModal() {
  const drawer = document.getElementById('brand-modal-drawer');
  if (drawer) drawer.classList.add('hidden');
}

function saveBrandFromModal(event) {
  event.preventDefault();

  const name = document.getElementById('form-brand-name').value;
  const country = document.getElementById('form-brand-country').value || 'Global';
  const categories = document.getElementById('form-brand-cats').value || 'General';

  const editIndex = parseInt(document.getElementById('form-brand-edit-index').value);

  if (editIndex >= 0 && editIndex < sampleBrands.length) {
    sampleBrands[editIndex] = { ...sampleBrands[editIndex], name, country, categories };
    showToast(`Updated brand "${name}"!`, 'success');
  } else {
    sampleBrands.unshift({ name, country, skusCount: 0, categories, status: 'Verified' });
    showToast(`Registered new brand "${name}"!`, 'success');
  }

  closeBrandModal();
  renderCategoriesAndBrandsPage();
}

function editBrandIndex(idx) {
  if (idx < 0 || idx >= sampleBrands.length) return;
  const b = sampleBrands[idx];

  openBrandModal();

  document.getElementById('modal-brand-title').innerText = `Edit Brand: ${b.name}`;
  document.getElementById('form-brand-edit-index').value = idx;
  document.getElementById('form-brand-name').value = b.name;
  document.getElementById('form-brand-country').value = b.country;
  document.getElementById('form-brand-cats').value = b.categories;
}

function deleteBrandIndex(idx) {
  if (confirm(`Are you sure you want to delete brand "${sampleBrands[idx].name}"?`)) {
    const name = sampleBrands[idx].name;
    sampleBrands.splice(idx, 1);
    showToast(`Deleted brand "${name}".`, 'warning');
    renderCategoriesAndBrandsPage();
  }
}

// ==========================================
// STOCK ADJUSTMENT & RECONCILIATION ENGINE
// ==========================================

let sampleStockAdjustments = [
  {
    refId: 'ADJ-9041',
    date: '2026-07-31 14:30',
    sku: 'SKU-8829',
    productName: 'Organic Almond Milk 1L',
    action: 'Subtract',
    qty: 5,
    unitCost: 180.00,
    impact: -900.00,
    reason: 'Expired / Damaged',
    user: 'Manager Alex',
    status: 'Approved'
  },
  {
    refId: 'ADJ-9042',
    date: '2026-07-31 16:15',
    sku: 'SKU-9942',
    productName: 'Artisan Dark Chocolate 85%',
    action: 'Add',
    qty: 10,
    unitCost: 130.00,
    impact: 1300.00,
    reason: 'Audit Variance Correction',
    user: 'Auditor Sarah',
    status: 'Approved'
  },
  {
    refId: 'ADJ-9043',
    date: '2026-07-30 11:20',
    sku: 'SKU-3321',
    productName: 'Extra Virgin Olive Oil 500ml',
    action: 'Subtract',
    qty: 2,
    unitCost: 650.00,
    impact: -1300.00,
    reason: 'Store Consumption / Tasting',
    user: 'Chef Marco',
    status: 'Pending Audit'
  },
  {
    refId: 'ADJ-9044',
    date: '2026-07-29 09:45',
    sku: 'SKU-7714',
    productName: 'Sparkling Mineral Water 750ml',
    action: 'Subtract',
    qty: 12,
    unitCost: 60.00,
    impact: -720.00,
    reason: 'Expired / Damaged',
    user: 'Warehouse Lead',
    status: 'Approved'
  },
  {
    refId: 'ADJ-9045',
    date: '2026-07-28 17:00',
    sku: 'SKU-5520',
    productName: 'Slow-Roasted Almonds 500g',
    action: 'Subtract',
    qty: 3,
    unitCost: 320.00,
    impact: -960.00,
    reason: 'Shrinkage / Missing',
    user: 'Auditor Sarah',
    status: 'Pending Audit'
  },
  {
    refId: 'ADJ-9046',
    date: '2026-07-27 10:10',
    sku: 'SKU-1149',
    productName: 'Organic Fuji Apples 1kg',
    action: 'Subtract',
    qty: 10,
    unitCost: 140.00,
    impact: -1400.00,
    reason: 'Expired / Damaged',
    user: 'QC Inspector',
    status: 'Approved'
  }
];

function renderStockAdjustmentsPage() {
  const container = document.getElementById('stock-adjust-table-container');
  if (!container) return;

  const searchQuery = (document.getElementById('search-stock-adjust-input')?.value || '').toLowerCase().trim();
  const reasonFilter = document.getElementById('filter-adjust-reason')?.value || 'all';

  // Filter dataset
  const filtered = sampleStockAdjustments.filter(item => {
    const matchesSearch = 
      item.refId.toLowerCase().includes(searchQuery) ||
      item.sku.toLowerCase().includes(searchQuery) ||
      item.productName.toLowerCase().includes(searchQuery) ||
      item.user.toLowerCase().includes(searchQuery);

    const matchesReason = reasonFilter === 'all' || item.reason === reasonFilter;

    return matchesSearch && matchesReason;
  });

  // Calculate Telemetry KPIs
  let netQty = 0;
  let netValuation = 0;
  let pendingCount = 0;

  sampleStockAdjustments.forEach(item => {
    const qtySign = item.action === 'Subtract' ? -item.qty : item.qty;
    netQty += qtySign;
    netValuation += item.impact;
    if (item.status === 'Pending Audit') pendingCount++;
  });

  const kpiCount = document.getElementById('kpi-adjust-count');
  const kpiQty = document.getElementById('kpi-adjust-qty');
  const kpiValue = document.getElementById('kpi-adjust-value');
  const kpiPending = document.getElementById('kpi-adjust-pending');
  const badge = document.getElementById('adjust-count-badge');

  if (kpiCount) kpiCount.innerText = `${sampleStockAdjustments.length} Logged`;
  if (kpiQty) kpiQty.innerText = `${netQty > 0 ? '+' : ''}${netQty} Units`;
  if (kpiValue) kpiValue.innerText = `₹${netValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (kpiPending) kpiPending.innerText = `${pendingCount} Pending`;
  if (badge) badge.innerText = `${sampleStockAdjustments.length} Audit Logs • ${pendingCount} Pending`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="glass-card p-12 rounded-3xl text-center space-y-3 border border-slate-200/80 dark:border-slate-800">
        <i data-lucide="clipboard-x" class="w-12 h-12 text-slate-400 mx-auto"></i>
        <h4 class="font-bold text-base text-slate-800 dark:text-slate-200">No Adjustment Logs Found</h4>
        <p class="text-xs text-slate-400">No audit logs match your search term or reason filter.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <div class="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-lg">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              <th class="py-3.5 px-4">Ref ID & Date</th>
              <th class="py-3.5 px-4">Product Info & SKU</th>
              <th class="py-3.5 px-4">Reason Code</th>
              <th class="py-3.5 px-4 text-center">Qty Variance</th>
              <th class="py-3.5 px-4 text-right">Unit Cost</th>
              <th class="py-3.5 px-4 text-right">Total Impact</th>
              <th class="py-3.5 px-4">Adjusted By</th>
              <th class="py-3.5 px-4 text-center">Audit Status</th>
              <th class="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
            ${filtered.map((item, idx) => {
              const isSub = item.action === 'Subtract';
              const qtyBadge = isSub ? 
                `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600 border border-rose-500/20">-${item.qty} Qty</span>` : 
                `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">+${item.qty} Qty</span>`;

              const statusBadge = item.status === 'Approved' ? 
                `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Approved</span>` : 
                `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20">Pending Audit</span>`;

              return `
                <tr class="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition">
                  <td class="py-3.5 px-4">
                    <div class="font-mono font-bold text-xs text-slate-900 dark:text-white">${item.refId}</div>
                    <div class="text-[10px] text-slate-400 font-mono mt-0.5">${item.date}</div>
                  </td>
                  <td class="py-3.5 px-4">
                    <div class="font-bold text-xs text-slate-900 dark:text-white">${item.productName}</div>
                    <div class="text-[10px] text-slate-400 font-mono mt-0.5">${item.sku}</div>
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] border border-slate-200 dark:border-slate-700">${item.reason}</span>
                  </td>
                  <td class="py-3.5 px-4 text-center font-mono">${qtyBadge}</td>
                  <td class="py-3.5 px-4 text-right font-mono text-slate-500">₹${item.unitCost.toFixed(2)}</td>
                  <td class="py-3.5 px-4 text-right font-mono font-bold ${isSub ? 'text-rose-600' : 'text-emerald-600'}">
                    ₹${item.impact.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td class="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-semibold">${item.user}</td>
                  <td class="py-3.5 px-4 text-center">${statusBadge}</td>
                  <td class="py-3.5 px-4 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      ${item.status === 'Pending Audit' ? `
                        <button onclick="approveStockAdjustment('${item.refId}')" title="Approve Adjustment" class="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 transition">
                          <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                        </button>
                      ` : ''}
                      <button onclick="deleteStockAdjustment('${item.refId}')" title="Delete Log" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

function filterStockAdjustments() {
  renderStockAdjustmentsPage();
}

function openStockAdjustModal() {
  const drawer = document.getElementById('stock-adjust-modal-drawer');
  const form = document.getElementById('stock-adjust-modal-form');
  const select = document.getElementById('form-adjust-sku');

  if (form) form.reset();

  if (select && typeof sampleProducts !== 'undefined') {
    select.innerHTML = sampleProducts.map(p => {
      const name = p.title || p.name;
      return `<option value="${p.sku}">${p.sku} - ${name} (Stock: ${p.stock})</option>`;
    }).join('');
  }

  if (drawer) drawer.classList.remove('hidden');
}

function closeStockAdjustModal() {
  const drawer = document.getElementById('stock-adjust-modal-drawer');
  if (drawer) drawer.classList.add('hidden');
}

function saveStockAdjustmentFromModal(event) {
  event.preventDefault();

  const sku = document.getElementById('form-adjust-sku').value;
  const action = document.getElementById('form-adjust-action').value;
  const qty = parseInt(document.getElementById('form-adjust-qty').value) || 1;
  const reason = document.getElementById('form-adjust-reason').value;
  const user = document.getElementById('form-adjust-user').value || 'Manager Alex';

  const product = sampleProducts.find(p => p.sku === sku);
  const productName = product ? (product.title || product.name) : 'Product';
  const unitCost = product ? (product.costPrice || product.price * 0.72) : 100;
  const impact = action === 'Subtract' ? -(qty * unitCost) : (qty * unitCost);

  // Update actual product stock inventory in memory
  if (product) {
    if (action === 'Subtract') {
      product.stock = Math.max(0, product.stock - qty);
    } else {
      product.stock += qty;
    }
  }

  const newRef = `ADJ-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  sampleStockAdjustments.unshift({
    refId: newRef,
    date: dateStr,
    sku,
    productName,
    action,
    qty,
    unitCost,
    impact,
    reason,
    user,
    status: 'Approved'
  });

  showToast(`Logged adjustment ${newRef} and updated product stock!`, 'success');
  closeStockAdjustModal();
  renderStockAdjustmentsPage();
  renderInventoryProductsPage();
  renderProductGrid(); // Sync POS terminal
}

function approveStockAdjustment(refId) {
  const item = sampleStockAdjustments.find(a => a.refId === refId);
  if (item) {
    item.status = 'Approved';
    showToast(`Approved audit log ${refId}!`, 'success');
    renderStockAdjustmentsPage();
  }
}

function deleteStockAdjustment(refId) {
  if (confirm(`Delete stock adjustment audit log ${refId}?`)) {
    sampleStockAdjustments = sampleStockAdjustments.filter(a => a.refId !== refId);
    showToast(`Deleted audit log ${refId}.`, 'warning');
    renderStockAdjustmentsPage();
  }
}

function exportStockAdjustCSV() {
  showToast('Exporting stock adjustment audit logs to CSV file...', 'info');
}

// ==========================================
// PURCHASE ORDERS & SUPPLIER PROCUREMENT ENGINE
// ==========================================

let samplePurchaseOrders = [
  {
    poNumber: 'PO-8041',
    date: '2026-07-30',
    supplier: 'Amul Dairy India',
    items: 'Organic Almond Milk 1L (100 units), Salted Butter (50 units)',
    total: 32500.00,
    deliveryDate: '2026-08-02',
    paymentStatus: 'Paid',
    status: 'Received'
  },
  {
    poNumber: 'PO-8042',
    date: '2026-07-31',
    supplier: 'Borges Overseas Spain',
    items: 'Extra Virgin Olive Oil 500ml (60 units)',
    total: 39000.00,
    deliveryDate: '2026-08-05',
    paymentStatus: 'Partial',
    status: 'Pending Delivery'
  },
  {
    poNumber: 'PO-8043',
    date: '2026-07-28',
    supplier: 'Nestle India Ltd',
    items: 'Artisan Dark Chocolate 85% (120 units)',
    total: 15600.00,
    deliveryDate: '2026-07-31',
    paymentStatus: 'Paid',
    status: 'Received'
  },
  {
    poNumber: 'PO-8044',
    date: '2026-07-29',
    supplier: 'Tropicana Organics USA',
    items: 'Cold Brew Coffee 330ml (200 units)',
    total: 42000.00,
    deliveryDate: '2026-08-04',
    paymentStatus: 'Unpaid',
    status: 'Pending Delivery'
  },
  {
    poNumber: 'PO-8045',
    date: '2026-07-25',
    supplier: 'Britannia Industries',
    items: 'Slow-Roasted Almonds 500g (80 units)',
    total: 25600.00,
    deliveryDate: '2026-07-27',
    paymentStatus: 'Paid',
    status: 'Received'
  },
  {
    poNumber: 'PO-8046',
    date: '2026-07-22',
    supplier: 'Fresh Green Farms',
    items: 'Organic Fuji Apples 1kg (300 units)',
    total: 42000.00,
    deliveryDate: '2026-07-24',
    paymentStatus: 'Paid',
    status: 'Received'
  }
];

let sampleSuppliers = [
  { name: 'Amul Dairy India', contact: 'Rajesh Sharma', phone: '+91 98201 12345', email: 'supply@amuldairy.com', gstin: '24AAACA1234F1Z9', ordersCount: 12, rating: '4.9 ★' },
  { name: 'Borges Overseas Spain', contact: 'Carlos Ruiz', phone: '+34 934 567890', email: 'export@borges.es', gstin: '9919ESP5678F1Z2', ordersCount: 8, rating: '4.8 ★' },
  { name: 'Nestle India Ltd', contact: 'Anita Desai', phone: '+91 98110 54321', email: 'orders@nestle.co.in', gstin: '07AAACN4321E1Z5', ordersCount: 15, rating: '4.9 ★' },
  { name: 'Tropicana Organics USA', contact: 'Michael Scott', phone: '+1 800 555 0199', email: 'sales@tropicanaorganics.com', gstin: '9918USA9876F1Z4', ordersCount: 6, rating: '4.6 ★' },
  { name: 'Britannia Industries', contact: 'Sanjay Verma', phone: '+91 98450 99887', email: 'procurement@britannia.co.in', gstin: '29AAACB9876D1Z1', ordersCount: 10, rating: '4.7 ★' }
];

let activePOTab = 'orders'; // 'orders' or 'suppliers'

function renderPurchaseOrdersPage() {
  const panel = document.getElementById('po-supplier-directory-panel');
  if (!panel) return;

  const searchQuery = (document.getElementById('search-po-input')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('filter-po-status')?.value || 'all';

  // Calculate KPIs
  let totalSpending = 0;
  let pendingCount = 0;

  samplePurchaseOrders.forEach(po => {
    totalSpending += po.total;
    if (po.status === 'Pending Delivery') pendingCount++;
  });

  const kpiVal = document.getElementById('kpi-po-total-value');
  const kpiCount = document.getElementById('kpi-po-count');
  const kpiPending = document.getElementById('kpi-po-pending');
  const kpiSupp = document.getElementById('kpi-supplier-count');
  const badge = document.getElementById('po-count-badge');

  if (kpiVal) kpiVal.innerText = `₹${totalSpending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (kpiCount) kpiCount.innerText = `${samplePurchaseOrders.length} Orders`;
  if (kpiPending) kpiPending.innerText = `${pendingCount} POs`;
  if (kpiSupp) kpiSupp.innerText = `${sampleSuppliers.length} Vendors`;
  if (badge) badge.innerText = `${samplePurchaseOrders.length} Orders • ${pendingCount} Pending Delivery`;

  if (activePOTab === 'orders') {
    // Filter Purchase Orders
    const filteredPOs = samplePurchaseOrders.filter(po => {
      const matchesSearch = 
        po.poNumber.toLowerCase().includes(searchQuery) ||
        po.supplier.toLowerCase().includes(searchQuery) ||
        po.items.toLowerCase().includes(searchQuery);

      const matchesStatus = statusFilter === 'all' || po.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    if (filteredPOs.length === 0) {
      panel.innerHTML = `
        <div class="glass-card p-12 rounded-3xl text-center space-y-3 border border-slate-200/80 dark:border-slate-800">
          <i data-lucide="truck" class="w-12 h-12 text-slate-400 mx-auto"></i>
          <h4 class="font-bold text-base text-slate-800 dark:text-slate-200">No Purchase Orders Found</h4>
          <p class="text-xs text-slate-400">No PO numbers or suppliers match your filter criteria.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    panel.innerHTML = `
      <div class="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-lg">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th class="py-3.5 px-4">PO Number & Date</th>
                <th class="py-3.5 px-4">Supplier Vendor</th>
                <th class="py-3.5 px-4">Items Summary</th>
                <th class="py-3.5 px-4 text-right">Total Amount</th>
                <th class="py-3.5 px-4">Expected Delivery</th>
                <th class="py-3.5 px-4 text-center">Payment Status</th>
                <th class="py-3.5 px-4 text-center">Order Status</th>
                <th class="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              ${filteredPOs.map(po => {
                const statusBadge = po.status === 'Received' ? 
                  `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Received Goods</span>` : 
                  `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20">Pending Delivery</span>`;

                const payBadge = po.paymentStatus === 'Paid' ? 
                  `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 border border-blue-500/20">Paid</span>` : 
                  (po.paymentStatus === 'Partial' ? 
                    `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-600 border border-purple-500/20">Partial</span>` : 
                    `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600 border border-rose-500/20">Unpaid</span>`);

                return `
                  <tr class="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition">
                    <td class="py-3.5 px-4">
                      <div class="font-mono font-bold text-xs text-slate-900 dark:text-white">${po.poNumber}</div>
                      <div class="text-[10px] text-slate-400 font-mono mt-0.5">${po.date}</div>
                    </td>
                    <td class="py-3.5 px-4 font-bold text-xs text-slate-900 dark:text-white">${po.supplier}</td>
                    <td class="py-3.5 px-4 text-slate-600 dark:text-slate-300 line-clamp-1 max-w-xs">${po.items}</td>
                    <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">₹${po.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td class="py-3.5 px-4 font-mono text-slate-500">${po.deliveryDate}</td>
                    <td class="py-3.5 px-4 text-center">${payBadge}</td>
                    <td class="py-3.5 px-4 text-center">${statusBadge}</td>
                    <td class="py-3.5 px-4 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        ${po.status === 'Pending Delivery' ? `
                          <button onclick="markPOReceived('${po.poNumber}')" title="Mark Goods Received" class="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 transition">
                            <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                          </button>
                        ` : ''}
                        <button onclick="deletePO('${po.poNumber}')" title="Delete PO" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    // Filter Suppliers
    const filteredSuppliers = sampleSuppliers.filter(s => 
      s.name.toLowerCase().includes(searchQuery) ||
      s.contact.toLowerCase().includes(searchQuery) ||
      s.email.toLowerCase().includes(searchQuery) ||
      s.gstin.toLowerCase().includes(searchQuery)
    );

    if (filteredSuppliers.length === 0) {
      panel.innerHTML = `
        <div class="glass-card p-12 rounded-3xl text-center space-y-3 border border-slate-200/80 dark:border-slate-800">
          <i data-lucide="building" class="w-12 h-12 text-slate-400 mx-auto"></i>
          <h4 class="font-bold text-base text-slate-800 dark:text-slate-200">No Suppliers Found</h4>
          <p class="text-xs text-slate-400">No supplier vendors match your search term.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    panel.innerHTML = `
      <div class="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-lg">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th class="py-3.5 px-4">Supplier Company</th>
                <th class="py-3.5 px-4">Contact Representative</th>
                <th class="py-3.5 px-4">Contact Phone & Email</th>
                <th class="py-3.5 px-4">GSTIN Number</th>
                <th class="py-3.5 px-4 text-center">Total Orders</th>
                <th class="py-3.5 px-4 text-center">Rating</th>
                <th class="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              ${filteredSuppliers.map((s, idx) => `
                <tr class="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition">
                  <td class="py-3.5 px-4 font-black text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md">
                      ${s.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span>${s.name}</span>
                  </td>
                  <td class="py-3.5 px-4 text-slate-700 dark:text-slate-200 font-semibold">${s.contact}</td>
                  <td class="py-3.5 px-4">
                    <div class="font-mono text-slate-600 dark:text-slate-300">${s.phone}</div>
                    <div class="text-[10px] text-slate-400">${s.email}</div>
                  </td>
                  <td class="py-3.5 px-4 font-mono text-slate-500">${s.gstin}</td>
                  <td class="py-3.5 px-4 text-center font-bold text-blue-600">${s.ordersCount} Orders</td>
                  <td class="py-3.5 px-4 text-center font-bold text-amber-500">${s.rating}</td>
                  <td class="py-3.5 px-4 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      <button onclick="editSupplierIndex(${idx})" title="Edit Supplier" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="deleteSupplierIndex(${idx})" title="Delete Supplier" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  if (window.lucide) window.lucide.createIcons();
}

function switchPOTab(tab, btn) {
  activePOTab = tab;

  document.querySelectorAll('.po-tab-btn').forEach(b => {
    b.classList.remove('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-500/20', 'font-bold');
    b.classList.add('text-slate-500', 'dark:text-slate-400');
  });

  if (btn) {
    btn.classList.add('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-500/20', 'font-bold');
    btn.classList.remove('text-slate-500', 'dark:text-slate-400');
  }

  renderPurchaseOrdersPage();
}

function filterPurchaseOrders() {
  renderPurchaseOrdersPage();
}

function openPOModal() {
  const drawer = document.getElementById('po-modal-drawer');
  const form = document.getElementById('po-modal-form');
  const select = document.getElementById('form-po-supplier');

  if (form) form.reset();

  if (select && typeof sampleSuppliers !== 'undefined') {
    select.innerHTML = sampleSuppliers.map(s => `<option value="${s.name}">${s.name} (${s.contact})</option>`).join('');
  }

  if (drawer) drawer.classList.remove('hidden');
}

function closePOModal() {
  const drawer = document.getElementById('po-modal-drawer');
  if (drawer) drawer.classList.add('hidden');
}

function savePOFromModal(event) {
  event.preventDefault();

  const supplier = document.getElementById('form-po-supplier').value;
  const items = document.getElementById('form-po-items').value;
  const total = parseFloat(document.getElementById('form-po-total').value) || 0;
  const deliveryDate = document.getElementById('form-po-delivery').value || '2026-08-10';
  const paymentStatus = document.getElementById('form-po-payment').value;
  const status = document.getElementById('form-po-status').value;

  const newPO = `PO-${Math.floor(8000 + Math.random() * 1000)}`;
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  samplePurchaseOrders.unshift({
    poNumber: newPO,
    date: dateStr,
    supplier,
    items,
    total,
    deliveryDate,
    paymentStatus,
    status
  });

  showToast(`Issued purchase order ${newPO} to ${supplier}!`, 'success');
  closePOModal();
  renderPurchaseOrdersPage();
}

function markPOReceived(poNumber) {
  const po = samplePurchaseOrders.find(p => p.poNumber === poNumber);
  if (po) {
    po.status = 'Received';
    showToast(`Marked goods received for ${poNumber}!`, 'success');
    renderPurchaseOrdersPage();
  }
}

function deletePO(poNumber) {
  if (confirm(`Delete purchase order ${poNumber}?`)) {
    samplePurchaseOrders = samplePurchaseOrders.filter(p => p.poNumber !== poNumber);
    showToast(`Deleted PO ${poNumber}.`, 'warning');
    renderPurchaseOrdersPage();
  }
}

function openSupplierModal() {
  const drawer = document.getElementById('supplier-modal-drawer');
  const form = document.getElementById('supplier-modal-form');

  if (form) form.reset();
  if (drawer) drawer.classList.remove('hidden');
}

function closeSupplierModal() {
  const drawer = document.getElementById('supplier-modal-drawer');
  if (drawer) drawer.classList.add('hidden');
}

function saveSupplierFromModal(event) {
  event.preventDefault();

  const name = document.getElementById('form-supplier-name').value;
  const contact = document.getElementById('form-supplier-contact').value || 'Vendor Contact';
  const phone = document.getElementById('form-supplier-phone').value || '+91 98000 00000';
  const email = document.getElementById('form-supplier-email').value || 'vendor@supply.com';
  const gstin = document.getElementById('form-supplier-gstin').value || '24AAACA9999F1Z0';

  sampleSuppliers.unshift({
    name, contact, phone, email, gstin, ordersCount: 0, rating: '5.0 ★'
  });

  showToast(`Registered new supplier vendor "${name}"!`, 'success');
  closeSupplierModal();
  renderPurchaseOrdersPage();
}

function editSupplierIndex(idx) {
  if (idx < 0 || idx >= sampleSuppliers.length) return;
  const s = sampleSuppliers[idx];

  openSupplierModal();

  document.getElementById('form-supplier-name').value = s.name;
  document.getElementById('form-supplier-contact').value = s.contact;
  document.getElementById('form-supplier-phone').value = s.phone;
  document.getElementById('form-supplier-email').value = s.email;
  document.getElementById('form-supplier-gstin').value = s.gstin;
}

function deleteSupplierIndex(idx) {
  if (confirm(`Are you sure you want to delete supplier "${sampleSuppliers[idx].name}"?`)) {
    const name = sampleSuppliers[idx].name;
    sampleSuppliers.splice(idx, 1);
    showToast(`Deleted supplier "${name}".`, 'warning');
    renderPurchaseOrdersPage();
  }
}

// ==========================================
// SALES INVOICES REGISTER & BILLING ENGINE
// ==========================================

let sampleSalesInvoices = [
  {
    invNumber: 'INV-7721',
    date: '2026-07-31 18:42',
    customer: 'Dr. Aris Thorne',
    items: 'Organic Almond Milk (x2), Artisan Dark Chocolate (x1)',
    amount: 897.00,
    tax: 136.83,
    paymentMethod: 'UPI / QR Code',
    status: 'Completed'
  },
  {
    invNumber: 'INV-7722',
    date: '2026-07-31 17:15',
    customer: 'Walk-in Customer',
    items: 'Extra Virgin Olive Oil 500ml (x1), Wildflower Honey (x2)',
    amount: 1480.00,
    tax: 225.76,
    paymentMethod: 'Credit Card',
    status: 'Completed'
  },
  {
    invNumber: 'INV-7723',
    date: '2026-07-31 15:30',
    customer: 'Sophia Martinez',
    items: 'Sparkling Mineral Water (x6), Organic Fuji Apples (x2)',
    amount: 640.00,
    tax: 97.62,
    paymentMethod: 'Cash',
    status: 'Completed'
  },
  {
    invNumber: 'INV-7724',
    date: '2026-07-30 19:10',
    customer: 'Vikram Sethi',
    items: 'Artisan Dark Chocolate (x5), Slow-Roasted Almonds (x3)',
    amount: 2450.00,
    tax: 373.72,
    paymentMethod: 'UPI / QR Code',
    status: 'Completed'
  },
  {
    invNumber: 'INV-7725',
    date: '2026-07-30 14:05',
    customer: 'Elena Rostova',
    items: 'Extra Virgin Olive Oil (x2), Organic Almond Milk (x4)',
    amount: 2296.00,
    tax: 350.23,
    paymentMethod: 'Credit Card',
    status: 'Completed'
  },
  {
    invNumber: 'INV-7726',
    date: '2026-07-29 16:45',
    customer: 'Walk-in Customer',
    items: 'Sparkling Mineral Water (x4)',
    amount: 320.00,
    tax: 48.81,
    paymentMethod: 'Cash',
    status: 'Completed'
  },
  {
    invNumber: 'INV-7727',
    date: '2026-07-29 11:20',
    customer: 'Marcus Chen',
    items: 'Wildflower Honey (x3), Slow-Roasted Almonds (x2)',
    amount: 1840.00,
    tax: 280.67,
    paymentMethod: 'UPI / QR Code',
    status: 'Completed'
  },
  {
    invNumber: 'INV-7728',
    date: '2026-07-28 13:50',
    customer: 'Priya Sharma',
    items: 'Organic Fuji Apples 1kg (x3)',
    amount: 550.00,
    tax: 26.19,
    paymentMethod: 'Cash',
    status: 'Refunded'
  }
];

function renderSalesInvoicesPage() {
  const container = document.getElementById('sales-invoices-table-container');
  if (!container) return;

  const searchQuery = (document.getElementById('search-sales-invoice-input')?.value || '').toLowerCase().trim();
  const paymentFilter = document.getElementById('filter-sales-payment')?.value || 'all';

  // Filter dataset
  const filtered = sampleSalesInvoices.filter(item => {
    const matchesSearch = 
      item.invNumber.toLowerCase().includes(searchQuery) ||
      item.customer.toLowerCase().includes(searchQuery) ||
      item.items.toLowerCase().includes(searchQuery);

    const matchesPayment = paymentFilter === 'all' || item.paymentMethod === paymentFilter;

    return matchesSearch && matchesPayment;
  });

  // Calculate Telemetry KPIs
  let totalBilled = 0;
  let totalTax = 0;

  sampleSalesInvoices.forEach(inv => {
    totalBilled += inv.amount;
    totalTax += inv.tax;
  });

  const avgVal = sampleSalesInvoices.length > 0 ? (totalBilled / sampleSalesInvoices.length) : 0;

  const kpiVal = document.getElementById('kpi-sales-total-value');
  const kpiTax = document.getElementById('kpi-sales-total-tax');
  const kpiCount = document.getElementById('kpi-sales-count');
  const kpiAvg = document.getElementById('kpi-sales-avg-value');
  const badge = document.getElementById('sales-invoice-count-badge');

  if (kpiVal) kpiVal.innerText = `₹${totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (kpiTax) kpiTax.innerText = `₹${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (kpiCount) kpiCount.innerText = `${sampleSalesInvoices.length} Invoices`;
  if (kpiAvg) kpiAvg.innerText = `₹${avgVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (badge) badge.innerText = `${sampleSalesInvoices.length} Invoices • ₹${totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Total Billed`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="glass-card p-12 rounded-3xl text-center space-y-3 border border-slate-200/80 dark:border-slate-800">
        <i data-lucide="receipt" class="w-12 h-12 text-slate-400 mx-auto"></i>
        <h4 class="font-bold text-base text-slate-800 dark:text-slate-200">No Sales Invoices Found</h4>
        <p class="text-xs text-slate-400">No invoice numbers or customer names match your search filter.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <div class="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-lg">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              <th class="py-3.5 px-4">Invoice ID & Date</th>
              <th class="py-3.5 px-4">Customer Name</th>
              <th class="py-3.5 px-4">Billed Items</th>
              <th class="py-3.5 px-4 text-right">GST Tax</th>
              <th class="py-3.5 px-4 text-right">Total Amount</th>
              <th class="py-3.5 px-4 text-center">Payment Method</th>
              <th class="py-3.5 px-4 text-center">Status</th>
              <th class="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
            ${filtered.map(inv => {
              const statusBadge = inv.status === 'Completed' ? 
                `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Completed</span>` : 
                `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600 border border-rose-500/20">Refunded</span>`;

              const payBadge = inv.paymentMethod === 'UPI / QR Code' ? 
                `<span class="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px] border border-purple-500/20">UPI / QR</span>` : 
                (inv.paymentMethod === 'Credit Card' ? 
                  `<span class="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px] border border-blue-500/20">Card</span>` : 
                  `<span class="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-500/20">Cash</span>`);

              return `
                <tr class="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition">
                  <td class="py-3.5 px-4">
                    <div class="font-mono font-bold text-xs text-slate-900 dark:text-white">${inv.invNumber}</div>
                    <div class="text-[10px] text-slate-400 font-mono mt-0.5">${inv.date}</div>
                  </td>
                  <td class="py-3.5 px-4 font-bold text-xs text-slate-900 dark:text-white">${inv.customer}</td>
                  <td class="py-3.5 px-4 text-slate-600 dark:text-slate-300 line-clamp-1 max-w-xs">${inv.items}</td>
                  <td class="py-3.5 px-4 text-right font-mono text-slate-500">₹${inv.tax.toFixed(2)}</td>
                  <td class="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white">₹${inv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td class="py-3.5 px-4 text-center">${payBadge}</td>
                  <td class="py-3.5 px-4 text-center">${statusBadge}</td>
                  <td class="py-3.5 px-4 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      <button onclick="viewSalesThermalReceipt('${inv.invNumber}')" title="Print Thermal Receipt" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                        <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                      </button>
                      ${inv.status === 'Completed' ? `
                        <button onclick="refundSalesInvoice('${inv.invNumber}')" title="Process Refund" class="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 transition">
                          <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

function filterSalesInvoices() {
  renderSalesInvoicesPage();
}

function viewSalesThermalReceipt(invNumber) {
  const inv = sampleSalesInvoices.find(i => i.invNumber === invNumber);
  if (!inv) return;

  const modal = document.getElementById('receipt-modal');
  const body = document.getElementById('receipt-modal-body');

  const subtotal = inv.amount - inv.tax;

  if (modal && body) {
    body.innerHTML = `
      <div class="space-y-4 font-mono text-xs text-slate-800 dark:text-slate-200">
        <div class="text-center space-y-1 pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
          <div class="font-black text-sm uppercase tracking-wider">APEX SUPERMARKET CHAIN</div>
          <div class="text-[10px] text-slate-400">Downtown Flagship Store • GSTIN: 27AAACA1234F1Z9</div>
          <div class="text-[10px] text-slate-400">Ph: +91 98200 11223 • Support: help@apexpos.com</div>
        </div>

        <div class="flex items-center justify-between text-[11px] font-bold">
          <span>INVOICE: ${inv.invNumber}</span>
          <span>${inv.date}</span>
        </div>

        <div class="text-[11px]">
          <span>CUSTOMER: </span><span class="font-bold">${inv.customer}</span>
        </div>

        <div class="py-2 border-y border-dashed border-slate-300 dark:border-slate-700 space-y-1 text-[11px]">
          <div class="font-bold line-clamp-2">${inv.items}</div>
        </div>

        <div class="space-y-1 text-right text-[11px] pt-1">
          <div class="flex justify-between"><span>Subtotal Excl Tax:</span> <span>₹${subtotal.toFixed(2)}</span></div>
          <div class="flex justify-between text-slate-400"><span>CGST (9%):</span> <span>₹${(inv.tax / 2).toFixed(2)}</span></div>
          <div class="flex justify-between text-slate-400"><span>SGST (9%):</span> <span>₹${(inv.tax / 2).toFixed(2)}</span></div>
          <div class="flex justify-between font-black text-sm text-emerald-600 pt-1 border-t border-slate-200 dark:border-slate-800">
            <span>GRAND TOTAL:</span> <span>₹${inv.amount.toFixed(2)}</span>
          </div>
        </div>

        <div class="text-center pt-3 text-[10px] text-slate-400 border-t border-dashed border-slate-300 dark:border-slate-700">
          <div>Payment via ${inv.paymentMethod} • Status: ${inv.status.toUpperCase()}</div>
          <div class="mt-1 font-bold">Thank you for shopping at ApexPOS Supermarket!</div>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
  }
}

function refundSalesInvoice(invNumber) {
  const inv = sampleSalesInvoices.find(i => i.invNumber === invNumber);
  if (inv && confirm(`Are you sure you want to process refund for Invoice ${invNumber} (₹${inv.amount})?`)) {
    inv.status = 'Refunded';
    showToast(`Refund processed for Invoice ${invNumber}.`, 'warning');
    renderSalesInvoicesPage();
  }
}

function exportSalesInvoicesCSV() {
  showToast('Exporting sales billing ledger to CSV file...', 'info');
}

// ==========================================
// INTER-WAREHOUSE TRANSFERS & RACK LOGISTICS ENGINE
// ==========================================

let sampleWarehouseTransfers = [
  {
    refId: 'TRF-6011',
    date: '2026-07-31 16:30',
    source: 'Central Warehouse A',
    dest: 'Downtown Flagship Store',
    items: 'Organic Almond Milk 1L (x50), Wildflower Honey (x20)',
    units: 70,
    value: 18900.00,
    carrier: 'Apex Fleet Truck #4 (Driver Manoj)',
    status: 'Completed'
  },
  {
    refId: 'TRF-6012',
    date: '2026-07-31 14:15',
    source: 'Cold Storage Hub B',
    dest: 'Central Warehouse A',
    items: 'Artisan Dark Chocolate 85% (x100)',
    units: 100,
    value: 13000.00,
    carrier: 'Refrigerated Logistics #2',
    status: 'In Transit'
  },
  {
    refId: 'TRF-6013',
    date: '2026-07-30 11:45',
    source: 'Central Warehouse A',
    dest: 'Suburban Outlet Store',
    items: 'Extra Virgin Olive Oil 500ml (x40)',
    units: 40,
    value: 26000.00,
    carrier: 'Apex Fleet Truck #1',
    status: 'Completed'
  },
  {
    refId: 'TRF-6014',
    date: '2026-07-30 09:20',
    source: 'Gourmet Vault C',
    dest: 'Downtown Flagship Store',
    items: 'Truffle Oil 250ml (x30), Artisan Chocolates (x50)',
    units: 80,
    value: 48500.00,
    carrier: 'Secured Logistics Transit',
    status: 'In Transit'
  },
  {
    refId: 'TRF-6015',
    date: '2026-07-29 17:10',
    source: 'Central Warehouse A',
    dest: 'Airport Retail Outlet',
    items: 'Sparkling Mineral Water 750ml (x150)',
    units: 150,
    value: 9000.00,
    carrier: 'Cargo Express Van #3',
    status: 'Completed'
  },
  {
    refId: 'TRF-6016',
    date: '2026-07-28 10:05',
    source: 'Suburban Outlet Store',
    dest: 'Cold Storage Hub B',
    items: 'Slow-Roasted Almonds 500g (x60)',
    units: 60,
    value: 19200.00,
    carrier: 'Apex Fleet Truck #2',
    status: 'Completed'
  }
];

let sampleWarehouses = [
  { name: 'Central Warehouse A', code: 'WH-CENTRAL-01', location: 'Industrial Zone 4, Mumbai', utilization: '78% Utilized', racks: 24, manager: 'David Miller', status: 'Active' },
  { name: 'Cold Storage Hub B', code: 'WH-COLD-02', location: 'Cold Logistics Park, Pune', utilization: '62% Utilized', racks: 16, manager: 'Pooja Nair', status: 'Active' },
  { name: 'Downtown Flagship Store', code: 'STORE-DT-01', location: 'Downtown High Street', utilization: '85% Utilized', racks: 12, manager: 'Alex Wong', status: 'Active' },
  { name: 'Gourmet Vault C', code: 'WH-GOURMET-03', location: 'Specialty Depot, Thane', utilization: '45% Utilized', racks: 8, manager: 'Vikram Roy', status: 'Active' }
];

let activeTransferTab = 'transfers'; // 'transfers' or 'warehouses'

function renderWarehouseTransfersPage() {
  const panel = document.getElementById('transfer-warehouse-directory-panel');
  if (!panel) return;

  const searchQuery = (document.getElementById('search-warehouse-transfer-input')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('filter-transfer-status')?.value || 'all';

  // Telemetry calculation
  let totalUnits = 0;
  let totalValuation = 0;
  let pendingCount = 0;

  sampleWarehouseTransfers.forEach(t => {
    totalUnits += t.units;
    totalValuation += t.value;
    if (t.status === 'In Transit') pendingCount++;
  });

  const kpiUnits = document.getElementById('kpi-trf-total-units');
  const kpiVal = document.getElementById('kpi-trf-total-value');
  const kpiPending = document.getElementById('kpi-trf-pending');
  const kpiWh = document.getElementById('kpi-wh-count');
  const badge = document.getElementById('transfer-count-badge');

  if (kpiUnits) kpiUnits.innerText = `${totalUnits} Units`;
  if (kpiVal) kpiVal.innerText = `₹${totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (kpiPending) kpiPending.innerText = `${pendingCount} Shipments`;
  if (kpiWh) kpiWh.innerText = `${sampleWarehouses.length} Facilities`;
  if (badge) badge.innerText = `${sampleWarehouseTransfers.length} Transfers • ${pendingCount} In Transit`;

  if (activeTransferTab === 'transfers') {
    // Filter Transfers
    const filteredTrfs = sampleWarehouseTransfers.filter(item => {
      const matchesSearch = 
        item.refId.toLowerCase().includes(searchQuery) ||
        item.source.toLowerCase().includes(searchQuery) ||
        item.dest.toLowerCase().includes(searchQuery) ||
        item.items.toLowerCase().includes(searchQuery);

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    if (filteredTrfs.length === 0) {
      panel.innerHTML = `
        <div class="glass-card p-12 rounded-3xl text-center space-y-3 border border-slate-200/80 dark:border-slate-800">
          <i data-lucide="truck" class="w-12 h-12 text-slate-400 mx-auto"></i>
          <h4 class="font-bold text-base text-slate-800 dark:text-slate-200">No Stock Transfers Found</h4>
          <p class="text-xs text-slate-400">No transfer ref IDs or facilities match your search filter.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    panel.innerHTML = `
      <div class="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-lg">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th class="py-3.5 px-4">Transfer Ref & Date</th>
                <th class="py-3.5 px-4">Origin & Destination</th>
                <th class="py-3.5 px-4">Items Transferred</th>
                <th class="py-3.5 px-4 text-center">Unit Qty</th>
                <th class="py-3.5 px-4 text-right">Transfer Valuation</th>
                <th class="py-3.5 px-4">Transport Carrier</th>
                <th class="py-3.5 px-4 text-center">Status</th>
                <th class="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              ${filteredTrfs.map(t => {
                const statusBadge = t.status === 'Completed' ? 
                  `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Received</span>` : 
                  `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> In Transit</span>`;

                return `
                  <tr class="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition">
                    <td class="py-3.5 px-4">
                      <div class="font-mono font-bold text-xs text-slate-900 dark:text-white">${t.refId}</div>
                      <div class="text-[10px] text-slate-400 font-mono mt-0.5">${t.date}</div>
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>${t.source}</span>
                        <i data-lucide="arrow-right" class="w-3 h-3 text-amber-500"></i>
                        <span>${t.dest}</span>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 text-slate-600 dark:text-slate-300 line-clamp-1 max-w-xs">${t.items}</td>
                    <td class="py-3.5 px-4 text-center font-bold text-amber-600 font-mono">${t.units} units</td>
                    <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">₹${t.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td class="py-3.5 px-4 text-slate-500 font-semibold">${t.carrier}</td>
                    <td class="py-3.5 px-4 text-center">${statusBadge}</td>
                    <td class="py-3.5 px-4 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        ${t.status === 'In Transit' ? `
                          <button onclick="markTransferReceived('${t.refId}')" title="Mark Received" class="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 transition">
                            <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                          </button>
                        ` : ''}
                        <button onclick="deleteWarehouseTransfer('${t.refId}')" title="Delete Transfer" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    // Filter Warehouses
    const filteredWH = sampleWarehouses.filter(w => 
      w.name.toLowerCase().includes(searchQuery) ||
      w.code.toLowerCase().includes(searchQuery) ||
      w.location.toLowerCase().includes(searchQuery) ||
      w.manager.toLowerCase().includes(searchQuery)
    );

    if (filteredWH.length === 0) {
      panel.innerHTML = `
        <div class="glass-card p-12 rounded-3xl text-center space-y-3 border border-slate-200/80 dark:border-slate-800">
          <i data-lucide="warehouse" class="w-12 h-12 text-slate-400 mx-auto"></i>
          <h4 class="font-bold text-base text-slate-800 dark:text-slate-200">No Warehouse Facilities Found</h4>
          <p class="text-xs text-slate-400">No facility name matches your search query.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    panel.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        ${filteredWH.map((wh, idx) => `
          <div class="glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-amber-500/50 transition duration-300 group">
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h4 class="font-extrabold text-base text-slate-900 dark:text-white">${wh.name}</h4>
                  <span class="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 font-mono text-[10px] font-bold">${wh.code}</span>
                </div>
                <div class="flex items-center gap-1 text-xs text-slate-400">
                  <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
                  <span>${wh.location}</span>
                </div>
              </div>
              <span class="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold text-xs border border-emerald-500/20">${wh.status}</span>
            </div>

            <div class="grid grid-cols-3 gap-3 pt-2">
              <div class="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60">
                <span class="text-[10px] font-bold text-slate-400 uppercase">Utilization</span>
                <div class="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">${wh.utilization}</div>
              </div>
              <div class="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60">
                <span class="text-[10px] font-bold text-slate-400 uppercase">Total Racks</span>
                <div class="font-extrabold text-sm text-amber-600 mt-0.5">${wh.racks} Racks</div>
              </div>
              <div class="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60">
                <span class="text-[10px] font-bold text-slate-400 uppercase">Manager</span>
                <div class="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5 line-clamp-1">${wh.manager}</div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <button onclick="editRackIndex(${idx})" class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit Facility
              </button>
              <button onclick="deleteRackIndex(${idx})" class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (window.lucide) window.lucide.createIcons();
}

function switchTransferTab(tab, btn) {
  activeTransferTab = tab;

  document.querySelectorAll('.trf-tab-btn').forEach(b => {
    b.classList.remove('bg-amber-600', 'text-white', 'shadow-md', 'shadow-amber-500/20', 'font-bold');
    b.classList.add('text-slate-500', 'dark:text-slate-400');
  });

  if (btn) {
    btn.classList.add('bg-amber-600', 'text-white', 'shadow-md', 'shadow-amber-500/20', 'font-bold');
    btn.classList.remove('text-slate-500', 'dark:text-slate-400');
  }

  renderWarehouseTransfersPage();
}

function filterWarehouseTransfers() {
  renderWarehouseTransfersPage();
}

function openTransferModal() {
  const drawer = document.getElementById('transfer-modal-drawer');
  const form = document.getElementById('transfer-modal-form');
  const sourceSel = document.getElementById('form-trf-source');
  const destSel = document.getElementById('form-trf-dest');

  if (form) form.reset();

  if (sourceSel && destSel && typeof sampleWarehouses !== 'undefined') {
    const opts = sampleWarehouses.map(w => `<option value="${w.name}">${w.name}</option>`).join('');
    sourceSel.innerHTML = opts;
    destSel.innerHTML = opts;
    if (destSel.options.length > 1) destSel.selectedIndex = 1;
  }

  if (drawer) drawer.classList.remove('hidden');
}

function closeTransferModal() {
  const drawer = document.getElementById('transfer-modal-drawer');
  if (drawer) drawer.classList.add('hidden');
}

function saveTransferFromModal(event) {
  event.preventDefault();

  const source = document.getElementById('form-trf-source').value;
  const dest = document.getElementById('form-trf-dest').value;
  const items = document.getElementById('form-trf-items').value;
  const units = parseInt(document.getElementById('form-trf-qty').value) || 50;
  const value = parseFloat(document.getElementById('form-trf-val').value) || (units * 250);
  const carrier = document.getElementById('form-trf-carrier').value || 'Apex Express Logistics';

  const newRef = `TRF-${Math.floor(6000 + Math.random() * 1000)}`;
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  sampleWarehouseTransfers.unshift({
    refId: newRef,
    date: dateStr,
    source,
    dest,
    items,
    units,
    value,
    carrier,
    status: 'In Transit'
  });

  showToast(`Dispatched stock transfer ${newRef} to ${dest}!`, 'success');
  closeTransferModal();
  renderWarehouseTransfersPage();
}

function markTransferReceived(refId) {
  const trf = sampleWarehouseTransfers.find(t => t.refId === refId);
  if (trf) {
    trf.status = 'Completed';
    showToast(`Marked shipment ${refId} as received at destination!`, 'success');
    renderWarehouseTransfersPage();
  }
}

function deleteWarehouseTransfer(refId) {
  if (confirm(`Delete transfer log ${refId}?`)) {
    sampleWarehouseTransfers = sampleWarehouseTransfers.filter(t => t.refId !== refId);
    showToast(`Deleted transfer log ${refId}.`, 'warning');
    renderWarehouseTransfersPage();
  }
}

function openRackModal() {
  const drawer = document.getElementById('rack-modal-drawer');
  const form = document.getElementById('rack-modal-form');

  if (form) form.reset();
  if (drawer) drawer.classList.remove('hidden');
}

function closeRackModal() {
  const drawer = document.getElementById('rack-modal-drawer');
  if (drawer) drawer.classList.add('hidden');
}

function saveRackFromModal(event) {
  event.preventDefault();

  const name = document.getElementById('form-wh-name').value;
  const code = document.getElementById('form-wh-code').value || `WH-${name.substring(0, 3).toUpperCase()}-05`;
  const racks = parseInt(document.getElementById('form-wh-racks').value) || 12;
  const location = document.getElementById('form-wh-location').value || 'Logistics Zone';
  const manager = document.getElementById('form-wh-manager').value || 'Warehouse Manager';

  sampleWarehouses.unshift({
    name, code, location, utilization: '0% Utilized', racks, manager, status: 'Active'
  });

  showToast(`Registered new warehouse facility "${name}"!`, 'success');
  closeRackModal();
  renderWarehouseTransfersPage();
}

function editRackIndex(idx) {
  if (idx < 0 || idx >= sampleWarehouses.length) return;
  const wh = sampleWarehouses[idx];

  openRackModal();

  document.getElementById('form-wh-name').value = wh.name;
  document.getElementById('form-wh-code').value = wh.code;
  document.getElementById('form-wh-racks').value = wh.racks;
  document.getElementById('form-wh-location').value = wh.location;
  document.getElementById('form-wh-manager').value = wh.manager;
}

function deleteRackIndex(idx) {
  if (confirm(`Are you sure you want to delete facility "${sampleWarehouses[idx].name}"?`)) {
    const name = sampleWarehouses[idx].name;
    sampleWarehouses.splice(idx, 1);
    showToast(`Deleted warehouse facility "${name}".`, 'warning');
    renderWarehouseTransfersPage();
  }
}

// ==========================================
// APEXPOS LUXURY GLASSMORPHISM CUSTOM CALENDAR ENGINE
// ==========================================

let activeCalendarInput = null;
let calendarCurrentYear = new Date().getFullYear();
let calendarCurrentMonth = new Date().getMonth(); // 0-indexed

function initCustomApexCalendars() {
  // Ensure calendar popover element exists in DOM
  if (!document.getElementById('apex-calendar-popover')) {
    const popover = document.createElement('div');
    popover.id = 'apex-calendar-popover';
    popover.className = 'fixed hidden animate-scale-in';
    document.body.appendChild(popover);

    // Close on outside click
    document.addEventListener('click', (e) => {
      const pop = document.getElementById('apex-calendar-popover');
      if (pop && !pop.classList.contains('hidden')) {
        if (!pop.contains(e.target) && activeCalendarInput && !activeCalendarInput.contains(e.target)) {
          closeApexCalendar();
        }
      }
    });
  }

  // Intercept all date inputs
  document.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.dataset.apexCalendarAttached) {
      input.dataset.apexCalendarAttached = 'true';
      
      // Override click & focus
      input.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openApexCalendar(input);
      });

      input.addEventListener('focus', (e) => {
        e.preventDefault();
        openApexCalendar(input);
      });
    }
  });
}

function openApexCalendar(input) {
  activeCalendarInput = input;
  const popover = document.getElementById('apex-calendar-popover');
  if (!popover) return;

  // Determine starting date
  let val = input.value;
  let d = new Date();
  if (val) {
    const parts = val.split('-');
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
  }

  calendarCurrentYear = d.getFullYear();
  calendarCurrentMonth = d.getMonth();

  // Position popover relative to input bounding box
  const rect = input.getBoundingClientRect();
  let top = rect.bottom + window.scrollY + 6;
  let left = rect.left + window.scrollX;

  // Clamp left if overflow
  if (left + 330 > window.innerWidth) {
    left = Math.max(10, window.innerWidth - 340);
  }

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
  popover.classList.remove('hidden');

  renderApexCalendarDays();
}

function closeApexCalendar() {
  const popover = document.getElementById('apex-calendar-popover');
  if (popover) popover.classList.add('hidden');
  activeCalendarInput = null;
}

function navigateCalendarMonth(delta) {
  calendarCurrentMonth += delta;
  if (calendarCurrentMonth > 11) {
    calendarCurrentMonth = 0;
    calendarCurrentYear++;
  } else if (calendarCurrentMonth < 0) {
    calendarCurrentMonth = 11;
    calendarCurrentYear--;
  }
  renderApexCalendarDays();
}

function selectCalendarDate(day) {
  if (!activeCalendarInput) return;

  const y = calendarCurrentYear;
  const m = String(calendarCurrentMonth + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  const formatted = `${y}-${m}-${d}`;

  activeCalendarInput.value = formatted;
  activeCalendarInput.dispatchEvent(new Event('change', { bubbles: true }));
  activeCalendarInput.dispatchEvent(new Event('input', { bubbles: true }));

  showToast(`Selected date: ${formatted}`, 'info');
  closeApexCalendar();
}

function selectCalendarToday() {
  const now = new Date();
  calendarCurrentYear = now.getFullYear();
  calendarCurrentMonth = now.getMonth();
  selectCalendarDate(now.getDate());
}

function clearCalendarDate() {
  if (activeCalendarInput) {
    activeCalendarInput.value = '';
    activeCalendarInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  closeApexCalendar();
}

function renderApexCalendarDays() {
  const popover = document.getElementById('apex-calendar-popover');
  if (!popover) return;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthName = monthNames[calendarCurrentMonth];

  // Selected date parsed
  let selectedY = -1, selectedM = -1, selectedD = -1;
  if (activeCalendarInput && activeCalendarInput.value) {
    const parts = activeCalendarInput.value.split('-');
    if (parts.length === 3) {
      selectedY = parseInt(parts[0]);
      selectedM = parseInt(parts[1]) - 1;
      selectedD = parseInt(parts[2]);
    }
  }

  const today = new Date();
  const isCurrentMonthYear = today.getFullYear() === calendarCurrentYear && today.getMonth() === calendarCurrentMonth;
  const todayDay = today.getDate();

  const firstDay = new Date(calendarCurrentYear, calendarCurrentMonth, 1).getDay();
  const totalDays = new Date(calendarCurrentYear, calendarCurrentMonth + 1, 0).getDate();

  let daysHtml = '';
  for (let i = 0; i < firstDay; i++) {
    daysHtml += `<div class="calendar-day-btn empty"></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const isSelected = selectedY === calendarCurrentYear && selectedM === calendarCurrentMonth && selectedD === day;
    const isToday = isCurrentMonthYear && todayDay === day;

    let classes = 'calendar-day-btn';
    if (isSelected) classes += ' selected';
    if (isToday) classes += ' today';

    daysHtml += `<div onclick="selectCalendarDate(${day})" class="${classes}">${day}</div>`;
  }

  popover.innerHTML = `
    <div class="space-y-3">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <span class="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">${monthName} ${calendarCurrentYear}</span>
        </div>
        <div class="flex items-center gap-1">
          <button onclick="navigateCalendarMonth(-1)" class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition">
            <i data-lucide="chevron-left" class="w-4 h-4"></i>
          </button>
          <button onclick="navigateCalendarMonth(1)" class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition">
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
          </button>
          <button onclick="closeApexCalendar()" class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition ml-1">✕</button>
        </div>
      </div>

      <!-- Weekday Labels -->
      <div class="grid grid-cols-7 text-center text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
      </div>

      <!-- Days Grid -->
      <div class="grid grid-cols-7 gap-1">
        ${daysHtml}
      </div>

      <!-- Footer Buttons -->
      <div class="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2.5 text-xs font-bold">
        <button onclick="clearCalendarDate()" class="text-slate-400 hover:text-rose-500">Clear</button>
        <button onclick="selectCalendarToday()" class="px-3 py-1 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition">Today</button>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

// ==========================================
// CUSTOMER CRM & LOYALTY REWARDS ENGINE
// ==========================================

let sampleCRMCustomers = [
  {
    id: 'CUST-901',
    name: 'Dr. Aris Thorne',
    phone: '+91 98201 99887',
    email: 'aris.thorne@apexmed.org',
    tier: 'VIP Diamond',
    orders: 28,
    totalSpent: 48900.00,
    points: 4890,
    lastVisit: '2026-07-31'
  },
  {
    id: 'CUST-902',
    name: 'Sophia Martinez',
    phone: '+91 98112 33445',
    email: 'sophia.m@designstudio.io',
    tier: 'Gold Member',
    orders: 18,
    totalSpent: 29400.00,
    points: 2940,
    lastVisit: '2026-07-31'
  },
  {
    id: 'CUST-903',
    name: 'Vikram Sethi',
    phone: '+91 98450 77665',
    email: 'vikram.sethi@techcorp.in',
    tier: 'Gold Member',
    orders: 22,
    totalSpent: 34200.00,
    points: 3420,
    lastVisit: '2026-07-30'
  },
  {
    id: 'CUST-904',
    name: 'Elena Rostova',
    phone: '+91 98300 44556',
    email: 'elena@rostova.com',
    tier: 'Silver Member',
    orders: 12,
    totalSpent: 18600.00,
    points: 1860,
    lastVisit: '2026-07-30'
  },
  {
    id: 'CUST-905',
    name: 'Marcus Chen',
    phone: '+91 98220 11223',
    email: 'marcus.chen@biotech.sg',
    tier: 'Silver Member',
    orders: 9,
    totalSpent: 12800.00,
    points: 1280,
    lastVisit: '2026-07-29'
  },
  {
    id: 'CUST-906',
    name: 'Priya Sharma',
    phone: '+91 98765 43210',
    email: 'priya.sharma@gmail.com',
    tier: 'Standard Member',
    orders: 4,
    totalSpent: 5200.00,
    points: 520,
    lastVisit: '2026-07-28'
  }
];

let sampleLoyaltyTiers = [
  { name: 'VIP Diamond', minSpend: 40000, cashback: '10% Cashback Points', perks: 'Free Express Shipping, Double Weekend Points, Dedicated Account Manager', membersCount: 1, color: 'purple' },
  { name: 'Gold Member', minSpend: 20000, cashback: '7.5% Cashback Points', perks: 'Priority Checkout Desk, Birthday Surprise Gift, Exclusive Invites', membersCount: 2, color: 'amber' },
  { name: 'Silver Member', minSpend: 10000, cashback: '5% Cashback Points', perks: '1.2x Point Multipliers on New Product Launches, Free Tote Bags', membersCount: 2, color: 'blue' },
  { name: 'Standard Member', minSpend: 0, cashback: '2.5% Cashback Points', perks: 'Earn 1 point for every ₹100 spent, Thermal receipt rewards', membersCount: 1, color: 'slate' }
];

let activeCRMTab = 'customers'; // 'customers' or 'tiers'

function renderCRMCustomersPage() {
  const panel = document.getElementById('crm-customer-directory-panel');
  if (!panel) return;

  const searchQuery = (document.getElementById('search-crm-customer-input')?.value || '').toLowerCase().trim();
  const tierFilter = document.getElementById('filter-crm-tier')?.value || 'all';

  // Telemetry KPIs calculation
  let totalPoints = 0;
  let totalLTV = 0;
  let vipGoldCount = 0;

  sampleCRMCustomers.forEach(c => {
    totalPoints += c.points;
    totalLTV += c.totalSpent;
    if (c.tier === 'VIP Diamond' || c.tier === 'Gold Member') vipGoldCount++;
  });

  const avgLTV = sampleCRMCustomers.length > 0 ? (totalLTV / sampleCRMCustomers.length) : 0;

  const kpiCount = document.getElementById('kpi-crm-total-count');
  const kpiPoints = document.getElementById('kpi-crm-total-points');
  const kpiVip = document.getElementById('kpi-crm-vip-count');
  const kpiLTV = document.getElementById('kpi-crm-avg-ltv');
  const badge = document.getElementById('crm-count-badge');

  if (kpiCount) kpiCount.innerText = `${sampleCRMCustomers.length} Members`;
  if (kpiPoints) kpiPoints.innerText = `${totalPoints.toLocaleString()} Pts`;
  if (kpiVip) kpiVip.innerText = `${vipGoldCount} Members`;
  if (kpiLTV) kpiLTV.innerText = `₹${avgLTV.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (badge) badge.innerText = `${sampleCRMCustomers.length} Members • ${totalPoints.toLocaleString()} Loyalty Points Total`;

  if (activeCRMTab === 'customers') {
    // Filter Customers
    const filteredCusts = sampleCRMCustomers.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchQuery) ||
        c.phone.toLowerCase().includes(searchQuery) ||
        c.email.toLowerCase().includes(searchQuery) ||
        c.id.toLowerCase().includes(searchQuery);

      const matchesTier = tierFilter === 'all' || c.tier === tierFilter;

      return matchesSearch && matchesTier;
    });

    if (filteredCusts.length === 0) {
      panel.innerHTML = `
        <div class="glass-card p-12 rounded-3xl text-center space-y-3 border border-slate-200/80 dark:border-slate-800">
          <i data-lucide="users" class="w-12 h-12 text-slate-400 mx-auto"></i>
          <h4 class="font-bold text-base text-slate-800 dark:text-slate-200">No Customers Found</h4>
          <p class="text-xs text-slate-400">No customer names or phone numbers match your search filter.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    panel.innerHTML = `
      <div class="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-lg">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th class="py-3.5 px-4">Customer Account</th>
                <th class="py-3.5 px-4">Contact Phone & Email</th>
                <th class="py-3.5 px-4 text-center">Membership Tier</th>
                <th class="py-3.5 px-4 text-center">Orders Placed</th>
                <th class="py-3.5 px-4 text-right">Lifetime Spent (LTV)</th>
                <th class="py-3.5 px-4 text-right">Loyalty Points</th>
                <th class="py-3.5 px-4">Last Visit</th>
                <th class="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              ${filteredCusts.map((c, idx) => {
                const tierBadge = c.tier === 'VIP Diamond' ? 
                  `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-600 border border-purple-500/20">💎 VIP Diamond</span>` : 
                  (c.tier === 'Gold Member' ? 
                    `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20">👑 Gold Member</span>` : 
                    (c.tier === 'Silver Member' ? 
                      `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 border border-blue-500/20">🥈 Silver Member</span>` : 
                      `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/10 text-slate-600 border border-slate-500/20">Standard Member</span>`));

                return `
                  <tr class="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition">
                    <td class="py-3.5 px-4">
                      <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white font-extrabold flex items-center justify-center text-xs shadow-md">
                          ${c.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div class="font-bold text-xs text-slate-900 dark:text-white">${c.name}</div>
                          <div class="text-[10px] text-slate-400 font-mono">${c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="font-mono text-slate-700 dark:text-slate-200 font-semibold">${c.phone}</div>
                      <div class="text-[10px] text-slate-400">${c.email}</div>
                    </td>
                    <td class="py-3.5 px-4 text-center">${tierBadge}</td>
                    <td class="py-3.5 px-4 text-center font-bold text-pink-600 font-mono">${c.orders} orders</td>
                    <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">₹${c.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td class="py-3.5 px-4 text-right font-mono font-black text-purple-600 dark:text-purple-400">${c.points.toLocaleString()} pts</td>
                    <td class="py-3.5 px-4 font-mono text-slate-500">${c.lastVisit}</td>
                    <td class="py-3.5 px-4 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        <button onclick="openBonusPointsDrawer('${c.id}')" title="Credit Bonus Points" class="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-600 hover:text-white text-purple-600 transition">
                          <i data-lucide="gift" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="editCustomerIndex('${c.id}')" title="Edit Customer" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-pink-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                          <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="deleteCustomerIndex('${c.id}')" title="Delete Customer" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 transition">
                          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    // Loyalty Tiers View
    panel.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        ${sampleLoyaltyTiers.map(t => `
          <div class="glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-pink-500/50 transition duration-300 group">
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <h4 class="font-extrabold text-lg text-slate-900 dark:text-white">${t.name}</h4>
                <p class="text-xs text-pink-600 dark:text-pink-400 font-bold">${t.cashback}</p>
              </div>
              <span class="px-3 py-1 rounded-xl bg-pink-500/10 text-pink-600 font-bold text-xs border border-pink-500/20">${t.membersCount} Active</span>
            </div>

            <div class="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <div class="flex justify-between text-xs">
                <span class="text-slate-400 font-semibold">Min Spend Required:</span>
                <span class="font-mono font-bold text-slate-900 dark:text-white">₹${t.minSpend.toLocaleString('en-IN')}</span>
              </div>
              <div class="text-xs space-y-1">
                <span class="text-slate-400 font-semibold block">Exclusive Perks:</span>
                <p class="text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">${t.perks}</p>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button onclick="showToast('Updated tier perks for ${t.name}!', 'info')" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-pink-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-xs transition">
                Configure Tier Perks
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (window.lucide) window.lucide.createIcons();
}

function switchCRMTab(tab, btn) {
  activeCRMTab = tab;

  document.querySelectorAll('.crm-tab-btn').forEach(b => {
    b.classList.remove('bg-pink-600', 'text-white', 'shadow-md', 'shadow-pink-500/20', 'font-bold');
    b.classList.add('text-slate-500', 'dark:text-slate-400');
  });

  if (btn) {
    btn.classList.add('bg-pink-600', 'text-white', 'shadow-md', 'shadow-pink-500/20', 'font-bold');
    btn.classList.remove('text-slate-500', 'dark:text-slate-400');
  }

  renderCRMCustomersPage();
}

function filterCRMCustomers() {
  renderCRMCustomersPage();
}

function openCustomerDrawer() {
  const drawer = document.getElementById('customer-modal-drawer');
  const form = document.getElementById('customer-modal-form');
  const title = document.getElementById('customer-drawer-title');

  if (form) form.reset();
  document.getElementById('form-cust-edit-id').value = '';
  if (title) title.innerText = 'Register New Customer';

  if (drawer) drawer.classList.remove('hidden');
}

function closeCustomerDrawer() {
  const drawer = document.getElementById('customer-modal-drawer');
  if (drawer) drawer.classList.add('hidden');
}

function saveCustomerFromDrawer(event) {
  event.preventDefault();

  const editId = document.getElementById('form-cust-edit-id').value;
  const name = document.getElementById('form-cust-name').value;
  const phone = document.getElementById('form-cust-phone').value;
  const email = document.getElementById('form-cust-email').value || 'customer@domain.com';
  const tier = document.getElementById('form-cust-tier').value;
  const points = parseInt(document.getElementById('form-cust-points').value) || 100;

  if (editId) {
    const cust = sampleCRMCustomers.find(c => c.id === editId);
    if (cust) {
      cust.name = name;
      cust.phone = phone;
      cust.email = email;
      cust.tier = tier;
      cust.points = points;
      showToast(`Updated customer account "${name}"!`, 'success');
    }
  } else {
    const newId = `CUST-${Math.floor(900 + Math.random() * 100)}`;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    sampleCRMCustomers.unshift({
      id: newId,
      name,
      phone,
      email,
      tier,
      orders: 0,
      totalSpent: 0,
      points,
      lastVisit: dateStr
    });

    showToast(`Registered new customer account "${name}" (${newId})!`, 'success');
  }

  closeCustomerDrawer();
  renderCRMCustomersPage();
}

function editCustomerIndex(id) {
  const cust = sampleCRMCustomers.find(c => c.id === id);
  if (!cust) return;

  openCustomerDrawer();

  document.getElementById('customer-drawer-title').innerText = `Edit Customer (${cust.id})`;
  document.getElementById('form-cust-edit-id').value = cust.id;
  document.getElementById('form-cust-name').value = cust.name;
  document.getElementById('form-cust-phone').value = cust.phone;
  document.getElementById('form-cust-email').value = cust.email;
  document.getElementById('form-cust-tier').value = cust.tier;
  document.getElementById('form-cust-points').value = cust.points;
}

function deleteCustomerIndex(id) {
  const cust = sampleCRMCustomers.find(c => c.id === id);
  if (cust && confirm(`Are you sure you want to delete customer account "${cust.name}"?`)) {
    sampleCRMCustomers = sampleCRMCustomers.filter(c => c.id !== id);
    showToast(`Deleted customer account "${cust.name}".`, 'warning');
    renderCRMCustomersPage();
  }
}

function openBonusPointsDrawer(id) {
  const cust = sampleCRMCustomers.find(c => c.id === id);
  if (!cust) return;

  const drawer = document.getElementById('points-modal-drawer');
  document.getElementById('form-points-cust-id').value = cust.id;
  document.getElementById('form-points-cust-name').value = `${cust.name} (${cust.points} Pts Current)`;

  if (drawer) drawer.classList.remove('hidden');
}

function closePointsDrawer() {
  const drawer = document.getElementById('points-modal-drawer');
  if (drawer) drawer.classList.add('hidden');
}

function saveBonusPointsFromDrawer(event) {
  event.preventDefault();

  const id = document.getElementById('form-points-cust-id').value;
  const amount = parseInt(document.getElementById('form-bonus-amount').value) || 500;
  const reason = document.getElementById('form-bonus-reason').value;

  const cust = sampleCRMCustomers.find(c => c.id === id);
  if (cust) {
    cust.points += amount;
    showToast(`Credited ${amount} bonus points to ${cust.name} (${reason})!`, 'success');
    closePointsDrawer();
    renderCRMCustomersPage();
  }
}

function exportCRMCustomerCSV() {
  showToast('Exporting customer CRM directory to CSV file...', 'info');
}

// ==========================================
// GST TAX SUITE & RETURN FILING ENGINE
// ==========================================

let sampleGSTReturns = [
  {
    period: 'July 2026',
    returnType: 'GSTR-1 (Outward Supplies)',
    turnover: 148920.00,
    cgst: 8935.20,
    sgst: 8935.20,
    igst: 0.00,
    totalTax: 17870.40,
    status: 'Filing Pending',
    filingDate: 'Due Aug 11, 2026'
  },
  {
    period: 'June 2026',
    returnType: 'GSTR-3B (Summary Return)',
    turnover: 215400.00,
    cgst: 12924.00,
    sgst: 12924.00,
    igst: 0.00,
    totalTax: 25848.00,
    status: 'Filed & Verified',
    filingDate: 'Filed Jul 20, 2026 (ARN: AA270726098712)'
  },
  {
    period: 'May 2026',
    returnType: 'GSTR-1 (Outward Supplies)',
    turnover: 198600.00,
    cgst: 11916.00,
    sgst: 11916.00,
    igst: 0.00,
    totalTax: 23832.00,
    status: 'Filed & Verified',
    filingDate: 'Filed Jun 11, 2026 (ARN: AA270626084123)'
  },
  {
    period: 'April 2026',
    returnType: 'GSTR-3B (Summary Return)',
    turnover: 182500.00,
    cgst: 10950.00,
    sgst: 10950.00,
    igst: 0.00,
    totalTax: 21900.00,
    status: 'Filed & Verified',
    filingDate: 'Filed May 20, 2026 (ARN: AA270526071490)'
  },
  {
    period: 'March 2026',
    returnType: 'GSTR-1 (Outward Supplies)',
    turnover: 245000.00,
    cgst: 14700.00,
    sgst: 14700.00,
    igst: 0.00,
    totalTax: 29400.00,
    status: 'Filed & Verified',
    filingDate: 'Filed Apr 11, 2026 (ARN: AA270426061234)'
  },
  {
    period: 'February 2026',
    returnType: 'GSTR-3B (Summary Return)',
    turnover: 160000.00,
    cgst: 9600.00,
    sgst: 9600.00,
    igst: 0.00,
    totalTax: 19200.00,
    status: 'Filed & Verified',
    filingDate: 'Filed Mar 20, 2026 (ARN: AA270326051982)'
  }
];

let sampleGSTTaxSlabs = [
  { name: '18% Standard GST', rate: '18%', taxableBase: 340000.00, cgst: 30600.00, sgst: 30600.00, totalTax: 61200.00, itemsCount: '14 SKUs (Chocolates, Premium Oils)', color: 'indigo' },
  { name: '12% Processed Foods', rate: '12%', taxableBase: 280000.00, cgst: 16800.00, sgst: 16800.00, totalTax: 33600.00, itemsCount: '18 SKUs (Beverages, Snacks)', color: 'blue' },
  { name: '5% Essential Groceries', rate: '5%', taxableBase: 220000.00, cgst: 5500.00, sgst: 5500.00, totalTax: 11000.00, itemsCount: '24 SKUs (Dairy, Organic Produce)', color: 'emerald' },
  { name: '0% Exempt Items', rate: '0%', taxableBase: 52400.00, cgst: 0.00, sgst: 0.00, totalTax: 0.00, itemsCount: '8 SKUs (Fresh Fruits, Raw Grains)', color: 'slate' }
];

let activeGSTTab = 'returns'; // 'returns' or 'slabs'

function renderGSTReportsPage() {
  const panel = document.getElementById('gst-reports-directory-panel');
  if (!panel) return;

  const searchQuery = (document.getElementById('search-gst-report-input')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('filter-gst-status')?.value || 'all';

  // Telemetry KPIs Calculation
  let totalTurnover = 0;
  let totalOutputTax = 0;
  let itcCredit = 42300.00; // Static eligible ITC credit benchmark

  sampleGSTReturns.forEach(r => {
    totalTurnover += r.turnover;
    totalOutputTax += r.totalTax;
  });

  const netPayable = Math.max(0, totalOutputTax - itcCredit);

  const kpiTurnover = document.getElementById('kpi-gst-total-turnover');
  const kpiOutput = document.getElementById('kpi-gst-output-tax');
  const kpiITC = document.getElementById('kpi-gst-itc-credit');
  const kpiNet = document.getElementById('kpi-gst-net-payable');
  const badge = document.getElementById('gst-count-badge');

  if (kpiTurnover) kpiTurnover.innerText = `₹${totalTurnover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (kpiOutput) kpiOutput.innerText = `₹${totalOutputTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (kpiITC) kpiITC.innerText = `₹${itcCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (kpiNet) kpiNet.innerText = `₹${netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (badge) badge.innerText = `GSTIN: 27AAACA1234F1Z9 • ₹${totalOutputTax.toLocaleString('en-IN')} Total Output Tax`;

  if (activeGSTTab === 'returns') {
    // Filter Returns
    const filteredReturns = sampleGSTReturns.filter(r => {
      const matchesSearch = 
        r.period.toLowerCase().includes(searchQuery) ||
        r.returnType.toLowerCase().includes(searchQuery) ||
        r.filingDate.toLowerCase().includes(searchQuery);

      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    if (filteredReturns.length === 0) {
      panel.innerHTML = `
        <div class="glass-card p-12 rounded-3xl text-center space-y-3 border border-slate-200/80 dark:border-slate-800">
          <i data-lucide="file-check-2" class="w-12 h-12 text-slate-400 mx-auto"></i>
          <h4 class="font-bold text-base text-slate-800 dark:text-slate-200">No GST Returns Found</h4>
          <p class="text-xs text-slate-400">No return period matches your filter criteria.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    panel.innerHTML = `
      <div class="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-lg">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th class="py-3.5 px-4">Tax Period Month</th>
                <th class="py-3.5 px-4">GST Return Type</th>
                <th class="py-3.5 px-4 text-right">Billed Turnover</th>
                <th class="py-3.5 px-4 text-right">CGST (9%)</th>
                <th class="py-3.5 px-4 text-right">SGST (9%)</th>
                <th class="py-3.5 px-4 text-right">Total GST Output</th>
                <th class="py-3.5 px-4 text-center">Filing Status</th>
                <th class="py-3.5 px-4">Filing Details & ARN</th>
                <th class="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              ${filteredReturns.map(r => {
                const statusBadge = r.status === 'Filed & Verified' ? 
                  `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Filed & Verified</span>` : 
                  `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending</span>`;

                return `
                  <tr class="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition">
                    <td class="py-3.5 px-4 font-bold text-xs text-slate-900 dark:text-white">${r.period}</td>
                    <td class="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">${r.returnType}</td>
                    <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">₹${r.turnover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td class="py-3.5 px-4 text-right font-mono text-slate-500">₹${r.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td class="py-3.5 px-4 text-right font-mono text-slate-500">₹${r.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td class="py-3.5 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">₹${r.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td class="py-3.5 px-4 text-center">${statusBadge}</td>
                    <td class="py-3.5 px-4 text-[10px] font-mono text-slate-500">${r.filingDate}</td>
                    <td class="py-3.5 px-4 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        <button onclick="downloadGSTReturnJSON('${r.period}')" title="Download JSON" class="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 transition">
                          <i data-lucide="file-down" class="w-3.5 h-3.5"></i>
                        </button>
                        ${r.status === 'Filing Pending' ? `
                          <button onclick="filePendingGSTReturn('${r.period}')" title="File Return Now" class="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-600 transition">
                            <i data-lucide="check-square" class="w-3.5 h-3.5"></i>
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    // Tax Slabs Breakdown View
    panel.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        ${sampleGSTTaxSlabs.map(s => `
          <div class="glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition duration-300 group">
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h4 class="font-extrabold text-lg text-slate-900 dark:text-white">${s.name}</h4>
                  <span class="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 font-mono text-[10px] font-bold">${s.rate} Rate</span>
                </div>
                <p class="text-xs text-slate-400 font-semibold">${s.itemsCount}</p>
              </div>
              <span class="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 font-bold text-xs border border-blue-500/20">Taxable Base: ₹${s.taxableBase.toLocaleString('en-IN')}</span>
            </div>

            <div class="grid grid-cols-3 gap-3 pt-2">
              <div class="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60">
                <span class="text-[10px] font-bold text-slate-400 uppercase">CGST Collected</span>
                <div class="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5">₹${s.cgst.toLocaleString('en-IN')}</div>
              </div>
              <div class="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60">
                <span class="text-[10px] font-bold text-slate-400 uppercase">SGST Collected</span>
                <div class="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5">₹${s.sgst.toLocaleString('en-IN')}</div>
              </div>
              <div class="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60">
                <span class="text-[10px] font-bold text-slate-400 uppercase">Total Tax</span>
                <div class="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">₹${s.totalTax.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <button onclick="showToast('Exported HSN breakdown for ${s.name}!', 'info')" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-xs transition">
                Export HSN Summary
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (window.lucide) window.lucide.createIcons();
}

function switchGSTTab(tab, btn) {
  activeGSTTab = tab;

  document.querySelectorAll('.gst-tab-btn').forEach(b => {
    b.classList.remove('bg-emerald-600', 'text-white', 'shadow-md', 'shadow-emerald-500/20', 'font-bold');
    b.classList.add('text-slate-500', 'dark:text-slate-400');
  });

  if (btn) {
    btn.classList.add('bg-emerald-600', 'text-white', 'shadow-md', 'shadow-emerald-500/20', 'font-bold');
    btn.classList.remove('text-slate-500', 'dark:text-slate-400');
  }

  renderGSTReportsPage();
}

function filterGSTReports() {
  renderGSTReportsPage();
}

function openGSTFileModal() {
  const drawer = document.getElementById('gst-file-modal-drawer');
  const form = document.getElementById('gst-file-modal-form');

  if (form) form.reset();
  if (drawer) drawer.classList.remove('hidden');
}

function closeGSTFileModal() {
  const drawer = document.getElementById('gst-file-modal-drawer');
  if (drawer) drawer.classList.add('hidden');
}

function saveGSTFilingFromModal(event) {
  event.preventDefault();

  const returnType = document.getElementById('form-gst-type').value;
  const period = document.getElementById('form-gst-period').value;
  const turnover = parseFloat(document.getElementById('form-gst-turnover').value) || 150000;
  const totalTax = parseFloat(document.getElementById('form-gst-totaltax').value) || 18000;
  const arn = document.getElementById('form-gst-arn').value || `ARN: AA270826${Math.floor(100000 + Math.random() * 900000)}`;

  const cgst = totalTax / 2;
  const sgst = totalTax / 2;

  sampleGSTReturns.unshift({
    period,
    returnType,
    turnover,
    cgst,
    sgst,
    igst: 0,
    totalTax,
    status: 'Filed & Verified',
    filingDate: `Filed Today (${arn})`
  });

  showToast(`Filed GST Return for ${period} (${arn})!`, 'success');
  closeGSTFileModal();
  renderGSTReportsPage();
}

function filePendingGSTReturn(period) {
  const r = sampleGSTReturns.find(item => item.period === period);
  if (r) {
    const newARN = `AA270826${Math.floor(100000 + Math.random() * 900000)}`;
    r.status = 'Filed & Verified';
    r.filingDate = `Filed Today (ARN: ${newARN})`;
    showToast(`Successfully filed GST return for ${period}!`, 'success');
    renderGSTReportsPage();
  }
}

function downloadGSTReturnJSON(period) {
  showToast(`Downloading GSTR-1 JSON schema for ${period}...`, 'info');
}

function exportGSTR1JSON() {
  showToast('Generating official GSTR-1 JSON schema export...', 'info');
}

// ==========================================
// MOBILE APPS ECOSYSTEM & SIMULATOR ENGINE
// ==========================================

let activeMobileMode = 'pos'; // 'pos', 'stocktake', 'logistics', 'loyalty', 'manager'
let isPhoneDarkTheme = false;
let currentPhoneModel = 'iphone'; // 'iphone', 'android', 'tablet'

// Mobile Fleet Registered Terminals Database
const mobileFleetDevices = [
  { id: 'DEV-901', name: 'Mobile POS Terminal #1', serial: 'SN-APX-88102', branch: 'Downtown Flagship', register: 'Lane 04', os: 'iOS 17.4', appVersion: 'v4.2.0', hardware: 'Thermal Printer + Socket Scanner', battery: 92, signal: '5G', status: 'Online', queueCount: 0, lastPing: '10 sec ago' },
  { id: 'DEV-902', name: 'Stock Audit Scanner A', serial: 'SN-APX-77401', branch: 'Westside Megastore', register: 'Warehouse A', os: 'Android 14', appVersion: 'v4.2.0', hardware: 'Zebra Cam Scanner', battery: 85, signal: 'WiFi', status: 'Online', queueCount: 0, lastPing: '1 min ago' },
  { id: 'DEV-903', name: 'Delivery Handheld #4', serial: 'SN-APX-66290', branch: 'Airport Express', register: 'Van #02', os: 'Android 13', appVersion: 'v4.1.9', hardware: 'GPS + E-Signature Pad', battery: 45, signal: '4G', status: 'Online', queueCount: 2, lastPing: '3 min ago' },
  { id: 'DEV-904', name: 'Loyalty Kiosk Pass', serial: 'SN-APX-55102', branch: 'Downtown Flagship', register: 'Customer Hub', os: 'iOS 17.2', appVersion: 'v4.2.0', hardware: 'NFC Reader + QR Cam', battery: 100, signal: 'WiFi', status: 'Online', queueCount: 0, lastPing: '30 sec ago' },
  { id: 'DEV-905', name: 'Mobile POS Terminal #2', serial: 'SN-APX-99310', branch: 'Northside Mart', register: 'Lane 02', os: 'iOS 17.4', appVersion: 'v4.2.0', hardware: 'Bluetooth Printer', battery: 78, signal: '5G', status: 'Online', queueCount: 0, lastPing: '5 min ago' },
  { id: 'DEV-906', name: 'Stock Audit Scanner B', serial: 'SN-APX-11209', branch: 'Central Warehouse', register: 'Rack B4', os: 'Android 14', appVersion: 'v4.2.0', hardware: 'Honeywell Barcode Gun', battery: 64, signal: 'WiFi', status: 'Syncing', queueCount: 14, lastPing: 'Just now' },
  { id: 'DEV-907', name: 'Delivery Driver #12', serial: 'SN-APX-44910', branch: 'Southside Hub', register: 'Van #05', os: 'Android 13', appVersion: 'v4.1.8', hardware: 'Mobile Thermal Printer', battery: 19, signal: '3G', status: 'Offline', queueCount: 5, lastPing: '42 min ago' },
  { id: 'DEV-908', name: 'Pop-up Kiosk POS', serial: 'SN-APX-33019', branch: 'Eastside Mall', register: 'Pop-up 01', os: 'PWA Web (Chrome)', appVersion: 'v4.2.0', hardware: 'Cash Drawer + Printer', battery: 100, signal: 'Ethernet', status: 'Online', queueCount: 0, lastPing: '1 min ago' }
];

function renderMobileFleetTable(query = '', branchFilter = 'all', osFilter = 'all', statusFilter = 'all') {
  const container = document.getElementById('mobile-fleet-table-body');
  if (!container) return;

  let filtered = mobileFleetDevices;

  if (query && query.trim() !== '') {
    const q = query.toLowerCase();
    filtered = filtered.filter(d => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || d.serial.toLowerCase().includes(q));
  }
  if (branchFilter !== 'all') {
    filtered = filtered.filter(d => d.branch === branchFilter);
  }
  if (osFilter !== 'all') {
    filtered = filtered.filter(d => d.os.toLowerCase().includes(osFilter.toLowerCase()));
  }
  if (statusFilter !== 'all') {
    filtered = filtered.filter(d => d.status.toLowerCase() === statusFilter.toLowerCase());
  }

  const countBadge = document.getElementById('fleet-count-badge');
  if (countBadge) countBadge.innerText = `${filtered.length} Devices`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <i data-lucide="smartphone-off" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
          <p class="font-bold text-xs">No mobile devices match your criteria</p>
        </td>
      </tr>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  let html = '';
  filtered.forEach(d => {
    let statusClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    let statusDot = 'bg-emerald-500 animate-pulse';
    if (d.status === 'Syncing') {
      statusClass = 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      statusDot = 'bg-purple-500 animate-spin';
    } else if (d.status === 'Offline') {
      statusClass = 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      statusDot = 'bg-slate-400';
    }

    let battColor = 'text-emerald-500';
    if (d.battery < 30) battColor = 'text-rose-500';
    else if (d.battery < 60) battColor = 'text-amber-500';

    html += `
      <tr class="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition text-xs">
        <td class="px-4 py-3 font-semibold text-slate-900 dark:text-white">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
              <i data-lucide="${d.os.includes('iOS') ? 'smartphone' : (d.os.includes('Android') ? 'tablet' : 'monitor')}" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>${d.name}</span>
                <span class="text-[10px] font-mono text-slate-400 font-normal">(${d.id})</span>
              </div>
              <div class="text-[10px] text-slate-400 font-mono">${d.serial}</div>
            </div>
          </div>
        </td>

        <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
          <div class="font-bold">${d.branch}</div>
          <div class="text-[10px] text-slate-400">${d.register}</div>
        </td>

        <td class="px-4 py-3">
          <span class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            ${d.os} • ${d.appVersion}
          </span>
        </td>

        <td class="px-4 py-3 text-slate-500">
          <div class="text-[11px] font-medium truncate max-w-[180px]">${d.hardware}</div>
        </td>

        <td class="px-4 py-3 font-mono">
          <div class="flex items-center gap-1.5 font-bold ${battColor}">
            <i data-lucide="battery" class="w-3.5 h-3.5"></i>
            <span>${d.battery}%</span>
            ${d.battery === 100 ? '<span class="text-[9px] text-emerald-600 font-sans font-bold">⚡ Charged</span>' : ''}
          </div>
        </td>

        <td class="px-4 py-3">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${statusClass}">
            <span class="w-1.5 h-1.5 rounded-full ${statusDot}"></span>
            ${d.status} (${d.queueCount} queued)
          </span>
        </td>

        <td class="px-4 py-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="pingDevice('${d.id}')" title="Ping Device telemetry" class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white transition">
              <i data-lucide="radio" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="syncDevice('${d.id}')" title="Force SQLite Queue Sync" class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-500 hover:text-white transition">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="openDeviceDetailModal('${d.id}')" title="View Full Specs & Hardware Diagnostics" class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white transition">
              <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

function filterFleetTable() {
  const q = document.getElementById('fleet-search-input')?.value || '';
  const branch = document.getElementById('fleet-branch-filter')?.value || 'all';
  const os = document.getElementById('fleet-os-filter')?.value || 'all';
  const status = document.getElementById('fleet-status-filter')?.value || 'all';
  renderMobileFleetTable(q, branch, os, status);
}

function pingDevice(id) {
  showToast(`Ping sent to Device ${id}! Response latency: 42ms. Telemetry active.`, 'success');
}

function syncDevice(id) {
  showToast(`Force SQLite Sync triggered for ${id}. 0 Pending records remaining.`, 'info');
  renderMobileFleetTable();
}

function openDeviceDetailModal(id) {
  const device = mobileFleetDevices.find(d => d.id === id) || mobileFleetDevices[0];
  const modal = document.getElementById('device-detail-modal');
  const body = document.getElementById('device-detail-modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h3 class="text-base font-extrabold text-slate-900 dark:text-white">${device.name}</h3>
          <p class="text-[11px] text-slate-400 font-mono">${device.id} • ${device.serial}</p>
        </div>
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">${device.status}</span>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 space-y-1">
          <span class="text-[10px] text-slate-400 font-bold uppercase">Store Branch</span>
          <div class="font-bold text-slate-900 dark:text-white">${device.branch}</div>
          <div class="text-[10px] text-slate-500">${device.register}</div>
        </div>
        <div class="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 space-y-1">
          <span class="text-[10px] text-slate-400 font-bold uppercase">OS & Build</span>
          <div class="font-bold text-slate-900 dark:text-white">${device.os}</div>
          <div class="text-[10px] text-sky-600 font-mono font-bold">${device.appVersion} Build</div>
        </div>
        <div class="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 space-y-1">
          <span class="text-[10px] text-slate-400 font-bold uppercase">Battery Telemetry</span>
          <div class="font-bold text-emerald-600 font-mono">${device.battery}% Charged</div>
          <div class="text-[10px] text-slate-500">Health: Normal (98%)</div>
        </div>
        <div class="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 space-y-1">
          <span class="text-[10px] text-slate-400 font-bold uppercase">Network & Signal</span>
          <div class="font-bold text-slate-900 dark:text-white">${device.signal} Connection</div>
          <div class="text-[10px] text-slate-500">Last Ping: ${device.lastPing}</div>
        </div>
      </div>

      <div class="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 space-y-1">
        <span class="text-[10px] text-slate-400 font-bold uppercase">Paired Peripherals</span>
        <div class="font-semibold text-slate-800 dark:text-slate-200">${device.hardware}</div>
      </div>

      <div class="pt-2 flex gap-2">
        <button onclick="pingDevice('${device.id}')" class="flex-1 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700">Ping Telemetry</button>
        <button onclick="syncDevice('${device.id}')" class="flex-1 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700">Force Sync</button>
        <button onclick="showToast('Device lock signal issued for security verification.', 'warning')" class="py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">Remote Lock</button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeDeviceDetailModal() {
  const modal = document.getElementById('device-detail-modal');
  if (modal) modal.classList.add('hidden');
}

function renderMobileAppSimulator() {
  const body = document.getElementById('phone-app-body');
  if (!body) return;

  if (activeMobileMode === 'pos') {
    body.innerHTML = `
      <div class="space-y-3 animate-fade-in">
        <!-- Search & Scan Header -->
        <div class="flex items-center gap-2">
          <div class="flex-1 relative">
            <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
            <input type="text" placeholder="Search item or scan barcode..." class="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-[11px] text-slate-900 dark:text-white outline-none">
          </div>
          <button onclick="triggerPhoneCamera()" class="p-1.5 rounded-xl bg-sky-600 text-white shadow-md shadow-sky-500/20"><i data-lucide="camera" class="w-3.5 h-3.5"></i></button>
        </div>

        <!-- Quick Item Grid (Mobile Touch) -->
        <div class="grid grid-cols-2 gap-2">
          <div onclick="addPhoneItem('Gourmet Chocolate', 250)" class="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition cursor-pointer">
            <div class="font-bold text-[11px] text-slate-900 dark:text-white truncate">Gourmet Chocolate</div>
            <div class="text-[10px] text-sky-600 font-mono font-bold mt-0.5">₹250.00</div>
          </div>
          <div onclick="addPhoneItem('Organic Almond Milk', 180)" class="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition cursor-pointer">
            <div class="font-bold text-[11px] text-slate-900 dark:text-white truncate">Almond Milk 1L</div>
            <div class="text-[10px] text-sky-600 font-mono font-bold mt-0.5">₹180.00</div>
          </div>
          <div onclick="addPhoneItem('Avocado Toast', 320)" class="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition cursor-pointer">
            <div class="font-bold text-[11px] text-slate-900 dark:text-white truncate">Avocado Toast</div>
            <div class="text-[10px] text-sky-600 font-mono font-bold mt-0.5">₹320.00</div>
          </div>
          <div onclick="addPhoneItem('Cold Brew Coffee', 150)" class="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition cursor-pointer">
            <div class="font-bold text-[11px] text-slate-900 dark:text-white truncate">Cold Brew Coffee</div>
            <div class="text-[10px] text-sky-600 font-mono font-bold mt-0.5">₹150.00</div>
          </div>
        </div>

        <!-- Floating Cart Card -->
        <div class="p-3 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 text-white space-y-2 shadow-lg">
          <div class="flex items-center justify-between text-[11px] font-bold">
            <span>Mobile Cart (3 Items)</span>
            <span class="font-mono text-xs">₹750.00</span>
          </div>
          <button onclick="showToast('Tap-to-Pay NFC Contactless Payment Initiated on Mobile!', 'success')" class="w-full py-2 rounded-xl bg-white text-sky-700 font-bold text-[11px] shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition">
            <i data-lucide="radio" class="w-3.5 h-3.5 animate-pulse"></i>
            <span>TAP TO PAY (NFC CONTACTLESS)</span>
          </button>
        </div>
      </div>
    `;
  } else if (activeMobileMode === 'stocktake') {
    body.innerHTML = `
      <div class="space-y-3 animate-fade-in text-xs">
        <div class="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 font-bold flex items-center justify-between">
          <span>Camera Barcode Scanner</span>
          <span class="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
        </div>

        <!-- Simulated Camera Viewfinder -->
        <div class="w-full h-32 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center relative overflow-hidden border-2 border-dashed border-purple-500">
          <i data-lucide="scan-line" class="w-8 h-8 text-purple-400 animate-bounce"></i>
          <span class="text-[10px] text-slate-400 mt-1">Align barcode in rectangle</span>
        </div>

        <div class="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
          <div class="font-bold text-slate-900 dark:text-white">Scanned SKU: SKU-1082 (Almond Milk)</div>
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Rack Location:</span>
            <span class="font-mono font-bold text-purple-600">A-04-SHELF-2</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Recorded Count:</span>
            <div class="flex items-center gap-2 font-mono font-bold">
              <button class="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-center">-</button>
              <span>42 Units</span>
              <button class="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-center">+</button>
            </div>
          </div>
          <button onclick="showToast('Recorded stock audit count for SKU-1082!', 'success')" class="w-full py-2 rounded-xl bg-purple-600 text-white font-bold text-[11px]">
            Confirm Stock Count
          </button>
        </div>
      </div>
    `;
  } else if (activeMobileMode === 'logistics') {
    body.innerHTML = `
      <div class="space-y-3 animate-fade-in text-xs">
        <div class="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold flex items-center justify-between">
          <span>Active Driver Dispatch Manifest</span>
          <span class="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px]">3 Deliveries Left</span>
        </div>

        <div class="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
          <div class="flex justify-between font-bold">
            <span class="text-slate-900 dark:text-white">Order #ORD-9021</span>
            <span class="text-emerald-600">En Route</span>
          </div>
          <div class="text-[11px] text-slate-500">Customer: Sophia Martinez (Downtown Flagship)</div>
          <div class="text-[10px] text-slate-400">124 Commercial Blvd, Suite 400</div>
          
          <button onclick="showToast('Opening mobile E-signature pad...', 'info')" class="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5">
            <i data-lucide="pen-tool" class="w-3.5 h-3.5"></i>
            <span>CAPTURE E-SIGNATURE</span>
          </button>
        </div>
      </div>
    `;
  } else if (activeMobileMode === 'loyalty') {
    body.innerHTML = `
      <div class="space-y-3 animate-fade-in text-xs">
        <div class="p-4 rounded-3xl bg-gradient-to-tr from-pink-600 to-rose-600 text-white space-y-3 shadow-lg">
          <div class="flex justify-between items-center">
            <span class="font-bold text-xs uppercase">Apex Loyalty Pass</span>
            <span class="px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold">VIP DIAMOND</span>
          </div>
          <div>
            <div class="text-[10px] opacity-80">Active Balance</div>
            <div class="text-2xl font-black font-mono">4,890 Pts</div>
          </div>
          <div class="pt-2 border-t border-white/20 flex justify-between text-[10px] opacity-90">
            <span>Dr. Aris Thorne</span>
            <span>ID: CUST-901</span>
          </div>
        </div>

        <div class="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Scan Pass at POS Register</span>
          <div class="w-36 h-12 mx-auto bg-slate-900 text-white rounded-xl flex items-center justify-center font-mono font-bold tracking-widest text-xs">
            |||| ||| ||||| |||
          </div>
        </div>
      </div>
    `;
  } else if (activeMobileMode === 'manager') {
    body.innerHTML = `
      <div class="space-y-3 animate-fade-in text-xs">
        <div class="p-4 rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-700 text-white space-y-3 shadow-lg">
          <div class="flex justify-between items-center">
            <span class="font-bold text-xs uppercase tracking-wider">Manager Live Insights</span>
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div>
            <div class="text-[10px] opacity-80">Today's Mobile Revenue</div>
            <div class="text-2xl font-black font-mono">₹1,42,890.00</div>
          </div>
          <div class="pt-2 border-t border-white/20 flex justify-between text-[10px] opacity-90">
            <span>Target: ₹1.5L (95.2%)</span>
            <span>142 Bills</span>
          </div>
        </div>

        <div class="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
          <div class="flex justify-between items-center font-bold">
            <span class="text-slate-900 dark:text-white">Store Telemetry</span>
            <span class="text-emerald-600">Peak Volume</span>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between text-[10px] text-slate-400">
              <span>Mobile Billing Share</span>
              <span class="font-bold text-slate-700 dark:text-slate-300">42.8%</span>
            </div>
            <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div class="bg-indigo-600 h-full rounded-full" style="width: 42.8%"></div>
            </div>
          </div>
          <button onclick="showToast('Refreshing Manager Mobile Telemetry Feed...', 'info')" class="w-full py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-[11px] mt-1">
            Refresh Telemetry
          </button>
        </div>
      </div>
    `;
  }

  if (window.lucide) window.lucide.createIcons();
}

function switchMobileAppMode(mode, btn) {
  activeMobileMode = mode;

  document.querySelectorAll('.mobile-mode-btn').forEach(b => {
    b.classList.remove('border-sky-500/30', 'bg-sky-500/10');
    b.classList.add('border-slate-200', 'dark:border-slate-800', 'bg-white/50', 'dark:bg-slate-900/50');
  });

  if (btn) {
    btn.classList.add('border-sky-500/30', 'bg-sky-500/10');
    btn.classList.remove('border-slate-200', 'dark:border-slate-800', 'bg-white/50', 'dark:bg-slate-900/50');
  }

  renderMobileAppSimulator();
}

function switchPhoneFrameModel(model) {
  currentPhoneModel = model;
  const shell = document.getElementById('phone-shell');
  if (!shell) return;

  if (model === 'android') {
    shell.className = 'w-[370px] h-[740px] bg-slate-900 dark:bg-slate-950 rounded-[32px] p-3 shadow-2xl border-[6px] border-slate-700 relative flex flex-col justify-between overflow-hidden shadow-purple-500/10';
    showToast('Switched simulator device frame to Rugged Android POS Terminal.', 'info');
  } else if (model === 'tablet') {
    shell.className = 'w-[440px] h-[680px] bg-slate-900 dark:bg-slate-950 rounded-[28px] p-4 shadow-2xl border-[6px] border-slate-800 relative flex flex-col justify-between overflow-hidden shadow-emerald-500/10';
    showToast('Switched simulator device frame to Kiosk Tablet Register.', 'info');
  } else {
    shell.className = 'w-[375px] h-[740px] bg-slate-900 dark:bg-slate-950 rounded-[48px] p-3.5 shadow-2xl border-[6px] border-slate-800 relative flex flex-col justify-between overflow-hidden shadow-sky-500/10';
    showToast('Switched simulator device frame to iPhone 15 Pro.', 'info');
  }
}

function togglePhoneTheme() {
  const screen = document.getElementById('phone-screen');
  if (!screen) return;

  isPhoneDarkTheme = !isPhoneDarkTheme;
  if (isPhoneDarkTheme) {
    screen.classList.add('dark');
  } else {
    screen.classList.remove('dark');
  }
}

function triggerPhoneCamera() {
  showToast('Simulating Mobile Barcode Camera Viewfinder Scan...', 'info');
}

function triggerPhoneThermalReceipt() {
  const modal = document.getElementById('receipt-modal');
  const body = document.getElementById('receipt-modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="space-y-3 text-center text-xs font-mono">
      <div class="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-widest">ApexPOS Mobile Store</div>
      <div class="text-[10px] text-slate-400">Downtown Flagship Branch</div>
      <div class="border-b border-dashed border-slate-300 dark:border-slate-700 py-1">
        <div>RECEIPT #MOB-88201</div>
        <div>Date: 2026-08-02 23:28</div>
      </div>
      <div class="space-y-1 text-left">
        <div class="flex justify-between"><span>Almond Milk 1L x2</span><span>₹498.00</span></div>
        <div class="flex justify-between"><span>Dark Chocolate 85% x1</span><span>₹180.00</span></div>
        <div class="flex justify-between"><span>Avocado Toast x1</span><span>₹320.00</span></div>
      </div>
      <div class="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
        <span>TOTAL PAID (NFC)</span>
        <span>₹998.00</span>
      </div>
      <div class="text-[10px] text-slate-400 pt-2">Thank you for shopping with ApexPOS!</div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function addPhoneItem(name, price) {
  showToast(`Added ${name} (₹${price}) to Mobile Cart!`, 'success');
}

function phoneNavClick(item, btn) {
  document.querySelectorAll('.phone-nav-item').forEach(i => {
    i.classList.remove('text-sky-600');
    i.classList.add('text-slate-400');
  });
  if (btn) btn.classList.add('text-sky-600');
}

function openPWAInstallModal() {
  const modal = document.getElementById('pwa-install-modal');
  if (modal) modal.classList.remove('hidden');
}

function closePWAInstallModal() {
  const modal = document.getElementById('pwa-install-modal');
  if (modal) modal.classList.add('hidden');
}

function triggerPWAInstallationPrompt() {
  showToast('PWA App Installed to Home Screen Successfully!', 'success');
  closePWAInstallModal();
}

function openQRDownloadModal() {
  const modal = document.getElementById('mobile-qr-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeQRDownloadModal() {
  const modal = document.getElementById('mobile-qr-modal');
  if (modal) modal.classList.add('hidden');
}

// Chart.js Mobile Apps Telemetry Charts Initialization
let mobileHourlyChart = null;
let mobilePaymentsChart = null;
let mobileModesChart = null;

function initMobileAppsCharts() {
  if (typeof Chart === 'undefined') return;

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.6)';

  // Chart 1: Hourly Transactions Line Chart
  const hourlyCanvas = document.getElementById('chart-mobile-hourly');
  if (hourlyCanvas) {
    if (mobileHourlyChart) mobileHourlyChart.destroy();
    const ctx = hourlyCanvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
    grad.addColorStop(1, 'rgba(14, 165, 233, 0.0)');

    mobileHourlyChart = new Chart(hourlyCanvas, {
      type: 'line',
      data: {
        labels: ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'],
        datasets: [{
          label: 'Mobile Bills Handled',
          data: [12, 45, 88, 120, 145, 190, 160, 85],
          borderColor: '#0ea5e9',
          backgroundColor: grad,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: '#0ea5e9',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  // Chart 2: Mobile Payment Split Doughnut Chart
  const payCanvas = document.getElementById('chart-mobile-payments');
  if (payCanvas) {
    if (mobilePaymentsChart) mobilePaymentsChart.destroy();
    mobilePaymentsChart = new Chart(payCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Tap-to-Pay NFC', 'Mobile UPI / QR', 'Card Swiper', 'Cash'],
        datasets: [{
          data: [48, 32, 14, 6],
          backgroundColor: ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, font: { size: 11, weight: 'bold' } }
          }
        },
        cutout: '70%'
      }
    });
  }

  // Chart 3: Fleet Activity Bar Chart
  const modesCanvas = document.getElementById('chart-mobile-modes');
  if (modesCanvas) {
    if (mobileModesChart) mobileModesChart.destroy();
    mobileModesChart = new Chart(modesCanvas, {
      type: 'bar',
      data: {
        labels: ['Billing POS', 'Stock Audit', 'Driver Logistics', 'Loyalty Scanner'],
        datasets: [{
          label: 'Active Daily Sessions',
          data: [240, 180, 95, 310],
          backgroundColor: ['#0ea5e9', '#a855f7', '#10b981', '#ec4899'],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor }, grid: { display: false } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }
}

function initCharts() {
  if (document.getElementById('chart-sales-trend')) {
    initIndexDashboardCharts('7d');
  } else {
    ['chart-sales', 'chart-categories', 'chart-sales-master'].forEach(id => drawCanvasChart(id));
  }
  initMobileAppsCharts();
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
  renderProductGrid();
  renderCart();
  renderHoldSuspendPage();
  renderInventoryProductsPage();
  renderCategoriesAndBrandsPage();
  renderStockAdjustmentsPage();
  renderPurchaseOrdersPage();
  renderSalesInvoicesPage();
  renderWarehouseTransfersPage();
  renderCRMCustomersPage();
  renderGSTReportsPage();
  renderMobileAppSimulator();
  renderMobileFleetTable();
  initCustomApexCalendars();
  setTimeout(initCharts, 200);
});

window.addEventListener('load', () => {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
});

window.addEventListener('resize', () => {
  setTimeout(initCharts, 100);
});


