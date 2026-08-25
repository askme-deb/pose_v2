import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CashierSession {
  cashierName: string;
  registerName: string;
  shiftLabel: string;
}

interface PosSessionState {
  session: CashierSession | null;
  token: string | null;
  storeId: string | null;
  login: (session: CashierSession, token?: string, storeId?: string | null) => void;
  logout: () => void;
}

export const usePosSessionStore = create<PosSessionState>()(
  persist(
    (set) => ({
      session: null,
      token: null,
      storeId: null,
      login: (session, token, storeId) => set({ session, token: token ?? null, storeId: storeId ?? null }),
      logout: () => set({ session: null, token: null, storeId: null }),
    }),
    { name: 'pospe-pos-session' },
  ),
);
