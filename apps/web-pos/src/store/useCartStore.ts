import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  gstRate: number;
}

export interface HeldBill {
  id: string;
  label: string;
  items: CartItem[];
  customer: string;
  heldAt: string;
}

interface CartState {
  items: CartItem[];
  customer: string;
  couponCode: string | null;
  heldBills: HeldBill[];
  addToCart: (item: Omit<CartItem, 'qty'>) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setCustomer: (customer: string) => void;
  applyCoupon: (code: string | null) => void;
  holdCurrentBill: (label: string) => void;
  recallHeldBill: (id: string) => void;
  voidHeldBill: (id: string) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: 'Walk-in Customer',
  couponCode: null,
  heldBills: [],

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

  clearCart: () => set({ items: [], couponCode: null, customer: 'Walk-in Customer' }),

  setCustomer: (customer) => set({ customer }),

  applyCoupon: (code) => set({ couponCode: code }),

  holdCurrentBill: (label) =>
    set((state) => ({
      heldBills: [
        ...state.heldBills,
        { id: `HOLD-${Date.now()}`, label, items: state.items, customer: state.customer, heldAt: new Date().toISOString() },
      ],
      items: [],
      couponCode: null,
      customer: 'Walk-in Customer',
    })),

  recallHeldBill: (id) =>
    set((state) => {
      const bill = state.heldBills.find((b) => b.id === id);
      if (!bill) return state;
      return { items: bill.items, customer: bill.customer, heldBills: state.heldBills.filter((b) => b.id !== id) };
    }),

  voidHeldBill: (id) => set((state) => ({ heldBills: state.heldBills.filter((b) => b.id !== id) })),
}));

export function cartTotals(items: CartItem[], discountPercent = 0) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const gst = items.reduce((sum, i) => sum + i.price * i.qty * (i.gstRate / 100), 0);
  const discount = subtotal * (discountPercent / 100);
  const total = subtotal + gst - discount;
  return { subtotal, gst, discount, total };
}
