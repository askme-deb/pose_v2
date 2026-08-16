/* ApexPOS Enterprise SaaS Application Logic Engine */

// State Store
const state = {
  theme: localStorage.getItem('theme') || 'light',
  currentView: 'dashboard',
  tenant: {
    name: 'Apex Supermarket Chain',
    store: 'Main Branch - Downtown',
    counter: 'Counter #04 (POS Express)',
    cashier: 'Alexander Wright',
    currency: '₹'
  },
  posCart: [
    { id: 1, name: 'Organic Almond Milk 1L', sku: 'SKU-8821', price: 249.00, qty: 2, tax: 18, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=150&auto=format&fit=crop&q=80' },
    { id: 2, name: 'Artisan Dark Chocolate 85%', sku: 'SKU-4912', price: 180.00, qty: 1, tax: 18, image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=150&auto=format&fit=crop&q=80' },
    { id: 3, name: 'Extra Virgin Olive Oil 500ml', sku: 'SKU-3094', price: 650.00, qty: 1, tax: 18, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150&auto=format&fit=crop&q=80' }
  ],
  heldBills: [
    { id: 'HOLD-904', customer: 'Walk-in Customer', itemsCount: 4, amount: 1420.00, time: '14:22 PM' },
    { id: 'HOLD-905', customer: 'Sarah Jenkins', itemsCount: 2, amount: 890.00, time: '14:45 PM' }
  ],
  products: [
    { id: 1, name: 'Organic Almond Milk 1L', category: 'Beverages', price: 249.00, stock: 142, barcode: '89010029381', status: 'In Stock', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=150&auto=format&fit=crop&q=80' },
    { id: 2, name: 'Artisan Dark Chocolate 85%', category: 'Confectionery', price: 180.00, stock: 88, barcode: '89010029382', status: 'In Stock', image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=150&auto=format&fit=crop&q=80' },
    { id: 3, name: 'Extra Virgin Olive Oil 500ml', category: 'Grocery', price: 650.00, stock: 24, barcode: '89010029383', status: 'Low Stock', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150&auto=format&fit=crop&q=80' },
    { id: 4, name: 'Fresh Italian Espresso Beans 1kg', category: 'Beverages', price: 1250.00, stock: 65, barcode: '89010029384', status: 'In Stock', image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=150&auto=format&fit=crop&q=80' },
    { id: 5, name: 'Himalayan Pink Salt 500g', category: 'Spices', price: 120.00, stock: 210, barcode: '89010029385', status: 'In Stock', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=150&auto=format&fit=crop&q=80' },
    { id: 6, name: 'Gluten-Free Oats 1kg', category: 'Breakfast', price: 340.00, stock: 8, barcode: '89010029386', status: 'Low Stock', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=150&auto=format&fit=crop&q=80' }
  ]
};

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
  initTheme();
  initRouter();
  initPOSCart();
  initCharts();
  initGlobalEvents();
});

// Theme Management
function initTheme() {
  if (state.theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', state.theme);
  initTheme();
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// Router & View Switcher
function initRouter() {
  const handleRoute = () => {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    state.currentView = hash;
    
    // Hide all view containers
    document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));

    // Show target view container
    const targetView = document.getElementById(`view-${hash}`);
    if (targetView) {
      targetView.classList.remove('hidden');
      targetView.classList.add('animate-fade-in');
    } else {
      // Default to 404 or dashboard
      const dashboard = document.getElementById('view-dashboard');
      if (dashboard) dashboard.classList.remove('hidden');
    }

    // Update active state in sidebar navigation
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href === `#${hash}`) {
        link.classList.add('bg-blue-600/10', 'text-blue-600', 'dark:bg-blue-500/20', 'dark:text-blue-400', 'font-semibold');
        link.classList.remove('text-slate-600', 'dark:text-slate-400');
      } else {
        link.classList.remove('bg-blue-600/10', 'text-blue-600', 'dark:bg-blue-500/20', 'dark:text-blue-400', 'font-semibold');
        link.classList.add('text-slate-600', 'dark:text-slate-400');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute(); // Execute on initial load
}

// POS Billing Cart Functions
function initPOSCart() {
  renderPOSCart();
}

function renderPOSCart() {
  const container = document.getElementById('pos-cart-items');
  if (!container) return;

  if (state.posCart.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-500">
        <i data-lucide="shopping-bag" class="w-12 h-12 stroke-1 mb-3"></i>
        <p class="text-sm font-medium">Cart is empty</p>
        <p class="text-xs text-slate-400">Scan barcode or click items to add</p>
      </div>
    `;
    updatePOSCalculations(0, 0, 0);
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  let subtotal = 0;
  let totalTax = 0;

  container.innerHTML = state.posCart.map((item, index) => {
    const itemSubtotal = item.price * item.qty;
    const itemTax = itemSubtotal * (item.tax / 100);
    subtotal += itemSubtotal;
    totalTax += itemTax;

    return `
      <div class="flex items-center justify-between p-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm transition hover:border-blue-300 dark:hover:border-blue-600">
        <div class="flex items-center gap-3">
          <img src="${item.image}" class="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700" alt="${item.name}">
          <div>
            <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">${item.name}</h4>
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>${item.sku}</span>
              <span>•</span>
              <span class="font-medium text-blue-600 dark:text-blue-400">${state.tenant.currency}${item.price.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
            <button onclick="updateCartQty(${index}, -1)" class="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">-</button>
            <span class="w-7 text-center text-xs font-bold text-slate-800 dark:text-slate-100">${item.qty}</span>
            <button onclick="updateCartQty(${index}, 1)" class="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">+</button>
          </div>
          <span class="text-sm font-bold text-slate-800 dark:text-slate-100 w-16 text-right">${state.tenant.currency}${itemSubtotal.toFixed(2)}</span>
          <button onclick="removeFromCart(${index})" class="text-slate-400 hover:text-red-500 transition p-1">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  updatePOSCalculations(subtotal, totalTax, subtotal + totalTax);
  if (window.lucide) window.lucide.createIcons();
}

function updatePOSCalculations(subtotal, tax, grandTotal) {
  const elSubtotal = document.getElementById('pos-subtotal');
  const elTax = document.getElementById('pos-tax');
  const elTotal = document.getElementById('pos-total');
  const elPayBtnAmount = document.getElementById('pos-pay-btn-amount');

  if (elSubtotal) elSubtotal.innerText = `${state.tenant.currency}${subtotal.toFixed(2)}`;
  if (elTax) elTax.innerText = `${state.tenant.currency}${tax.toFixed(2)}`;
  if (elTotal) elTotal.innerText = `${state.tenant.currency}${grandTotal.toFixed(2)}`;
  if (elPayBtnAmount) elPayBtnAmount.innerText = `${state.tenant.currency}${grandTotal.toFixed(2)}`;
}

function addToCart(productId) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  const existing = state.posCart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    state.posCart.push({
      id: prod.id,
      name: prod.name,
      sku: `SKU-00${prod.id}`,
      price: prod.price,
      qty: 1,
      tax: 18,
      image: prod.image
    });
  }
  renderPOSCart();
  showToast(`Added ${prod.name} to POS Cart`, 'success');
}

function updateCartQty(index, delta) {
  if (state.posCart[index]) {
    state.posCart[index].qty += delta;
    if (state.posCart[index].qty <= 0) {
      state.posCart.splice(index, 1);
    }
    renderPOSCart();
  }
}

function removeFromCart(index) {
  if (state.posCart[index]) {
    state.posCart.splice(index, 1);
    renderPOSCart();
    showToast('Item removed from cart', 'info');
  }
}

function clearCart() {
  state.posCart = [];
  renderPOSCart();
  showToast('POS Cart Cleared', 'info');
}

function holdCurrentBill() {
  if (state.posCart.length === 0) {
    showToast('Cart is empty, cannot hold bill', 'warning');
    return;
  }
  const billId = `HOLD-${Math.floor(100 + Math.random() * 900)}`;
  const total = state.posCart.reduce((sum, item) => sum + item.price * item.qty * 1.18, 0);
  state.heldBills.push({
    id: billId,
    customer: 'Walk-in Customer',
    itemsCount: state.posCart.reduce((sum, item) => sum + item.qty, 0),
    amount: total,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  state.posCart = [];
  renderPOSCart();
  showToast(`Bill ${billId} placed on Hold`, 'success');
}

// Thermal Receipt Modal Generator
function openReceiptModal() {
  const modal = document.getElementById('receipt-modal');
  if (!modal) return;

  const receiptContent = document.getElementById('receipt-modal-body');
  if (receiptContent) {
    const invoiceNo = `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date().toLocaleString();
    let subtotal = 0;
    let tax = 0;

    const itemsHTML = state.posCart.map(item => {
      const itemTot = item.price * item.qty;
      subtotal += itemTot;
      tax += itemTot * 0.18;
      return `
        <div class="flex justify-between text-xs py-1 border-b border-dashed border-slate-300 dark:border-slate-700">
          <span>${item.qty}x ${item.name}</span>
          <span class="font-mono font-medium">${state.tenant.currency}${itemTot.toFixed(2)}</span>
        </div>
      `;
    }).join('');

    const grandTotal = subtotal + tax;

    receiptContent.innerHTML = `
      <div class="text-center pb-4 border-b border-dashed border-slate-300 dark:border-slate-700">
        <h2 class="text-lg font-bold tracking-tight text-slate-900 dark:text-white">${state.tenant.name}</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${state.tenant.store}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">GSTIN: 27AAAAA0000A1Z5 | Ph: +91 98765 43210</p>
        <div class="mt-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 p-1.5 rounded text-slate-700 dark:text-slate-300">
          Receipt #: ${invoiceNo} | Date: ${now}
        </div>
      </div>
      <div class="py-3">
        ${itemsHTML}
      </div>
      <div class="pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 text-xs space-y-1">
        <div class="flex justify-between text-slate-600 dark:text-slate-400">
          <span>Subtotal</span>
          <span class="font-mono">${state.tenant.currency}${subtotal.toFixed(2)}</span>
        </div>
        <div class="flex justify-between text-slate-600 dark:text-slate-400">
          <span>CGST (9%) + SGST (9%)</span>
          <span class="font-mono">${state.tenant.currency}${tax.toFixed(2)}</span>
        </div>
        <div class="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
          <span>Total Paid (UPI/Card)</span>
          <span class="font-mono text-blue-600 dark:text-blue-400">${state.tenant.currency}${grandTotal.toFixed(2)}</span>
        </div>
      </div>
      <div class="text-center pt-4 mt-4 border-t border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500">
        <p class="font-semibold text-slate-700 dark:text-slate-300">Thank you for shopping with us!</p>
        <p class="mt-0.5">Powered by ApexPOS SaaS Platform</p>
        <div class="mt-3 flex justify-center">
          <div class="font-mono text-[10px] tracking-widest bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded">||| | |||| ||| ||||| |||</div>
        </div>
      </div>
    `;
  }

  modal.classList.remove('hidden');
}

function closeReceiptModal() {
  const modal = document.getElementById('receipt-modal');
  if (modal) modal.classList.add('hidden');
}

function completeCheckout() {
  if (state.posCart.length === 0) {
    showToast('Cart is empty!', 'warning');
    return;
  }
  openReceiptModal();
}

// Chart Visualization Generator (Canvas SVG)
function initCharts() {
  renderSalesGraph();
  renderRevenueGraph();
}

function renderSalesGraph() {
  const canvas = document.getElementById('chart-sales-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.parentElement.clientWidth || 500;
  const height = canvas.height = 200;

  ctx.clearRect(0, 0, width, height);

  const points = [45, 62, 58, 85, 76, 110, 95, 130, 125, 160, 145, 190];
  const stepX = width / (points.length - 1);
  const maxY = Math.max(...points) * 1.2;

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(37, 99, 235, 0.35)');
  gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

  ctx.beginPath();
  ctx.moveTo(0, height);
  points.forEach((val, i) => {
    const x = i * stepX;
    const y = height - (val / maxY) * height;
    if (i === 0) ctx.lineTo(x, y);
    else {
      const prevX = (i - 1) * stepX;
      const prevY = height - (points[i - 1] / maxY) * height;
      const cx = (prevX + x) / 2;
      ctx.bezierCurveTo(cx, prevY, cx, y, x, y);
    }
  });
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line stroke
  ctx.beginPath();
  points.forEach((val, i) => {
    const x = i * stepX;
    const y = height - (val / maxY) * height;
    if (i === 0) ctx.moveTo(x, y);
    else {
      const prevX = (i - 1) * stepX;
      const prevY = height - (points[i - 1] / maxY) * height;
      const cx = (prevX + x) / 2;
      ctx.bezierCurveTo(cx, prevY, cx, y, x, y);
    }
  });
  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function renderRevenueGraph() {
  const canvas = document.getElementById('chart-revenue-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.parentElement.clientWidth || 500;
  const height = canvas.height = 200;

  ctx.clearRect(0, 0, width, height);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const values = [120, 180, 160, 240, 290, 340, 310, 420];
  const barWidth = (width / values.length) * 0.45;
  const maxY = Math.max(...values) * 1.2;

  values.forEach((val, i) => {
    const x = i * (width / values.length) + barWidth / 2;
    const barH = (val / maxY) * height;
    const y = height - barH;

    const grad = ctx.createLinearGradient(0, y, 0, height);
    grad.addColorStop(0, '#7C3AED');
    grad.addColorStop(1, '#06B6D4');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barH, [6, 6, 0, 0]);
    ctx.fill();
  });
}

// Global Event Listeners & Modals
function initGlobalEvents() {
  // Command K search shortcut
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggleSearchModal();
    }
  });

  window.addEventListener('resize', () => {
    initCharts();
  });
}

function toggleSearchModal() {
  const modal = document.getElementById('search-modal');
  if (modal) modal.classList.toggle('hidden');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = {
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-500 text-white',
    danger: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white'
  };

  const toast = document.createElement('div');
  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${colors[type] || colors.info} animate-scale-in text-sm font-medium`;
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" class="opacity-80 hover:opacity-100">✕</button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}
