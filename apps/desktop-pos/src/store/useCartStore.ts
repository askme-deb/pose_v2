import { create } from 'zustand';
import {
  holdBill,
  listHeldBills,
  recallHeldBill as apiRecallHeldBill,
  voidHeldBill as apiVoidHeldBill,
  type ApiHeldBill,
} from '../services/api/billing';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  gstRate: number;
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  customerName: string;
  couponCode: string | null;
  heldBills: ApiHeldBill[];
  heldBillsLoading: boolean;
  addToCart: (item: Omit<CartItem, 'qty'>) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setCustomer: (customerId: string | null, customerName: string) => void;
  applyCoupon: (code: string | null) => void;
  loadHeldBills: () => Promise<void>;
  holdCurrentBill: (label: string, discountPercent: number) => Promise<void>;
  recallHeldBill: (id: string) => Promise<void>;
  voidHeldBill: (id: string) => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  customerName: 'Walk-in Customer',
  couponCode: null,
  heldBills: [],
  heldBillsLoading: false,

  addToCart: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return { items: state.items.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i)) };
      }
      return { items: [...state.items, { ...item, qty: 1 }] };
    }),

  updateQty: (id, qty) =>
    set((state) => ({
      items: qty <= 0 ? state.items.filter((i) => i.id !== id) : state.items.map((i) => (i.id === id ? { ...i, qty } : i)),
    })),

  removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  clearCart: () => set({ items: [], couponCode: null, customerId: null, customerName: 'Walk-in Customer' }),

  setCustomer: (customerId, customerName) => set({ customerId, customerName }),

  applyCoupon: (code) => set({ couponCode: code }),

  // Held bills are real, backend-persisted (billing-service) rows now — this
  // just keeps a local cache for instant badge counts / list rendering,
  // refreshed after every hold/recall/void so it never drifts far from the
  // server, and on demand wherever a page needs a fresh read (e.g. opening
  // the held-bills page or drawer).
  loadHeldBills: async () => {
    set({ heldBillsLoading: true });
    try {
      const heldBills = await listHeldBills();
      set({ heldBills });
    } finally {
      set({ heldBillsLoading: false });
    }
  },

  holdCurrentBill: async (label, discountPercent) => {
    const state = get();
    await holdBill({
      customerId: state.customerId ?? undefined,
      items: state.items.map((i) => ({ productId: i.id, quantity: i.qty })),
      discountPercent,
      label,
    });
    set({ items: [], couponCode: null, customerId: null, customerName: 'Walk-in Customer' });
    await get().loadHeldBills();
  },

  recallHeldBill: async (id) => {
    const recalled = await apiRecallHeldBill(id);
    set({
      items: recalled.items.map((i) => ({ id: i.productId, name: i.name, price: i.price, qty: i.quantity, gstRate: i.gstRate })),
      customerId: recalled.customerId,
      customerName: recalled.customerName,
    });
    await get().loadHeldBills();
  },

  voidHeldBill: async (id) => {
    await apiVoidHeldBill(id);
    await get().loadHeldBills();
  },
}));

export function cartTotals(items: CartItem[], discountPercent = 0) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const gst = items.reduce((sum, i) => sum + i.price * i.qty * (i.gstRate / 100), 0);
  const discount = subtotal * (discountPercent / 100);
  const total = subtotal + gst - discount;
  return { subtotal, gst, discount, total };
}
