import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CashierSession {
  cashierName: string;
  registerName: string;
  shiftLabel: string;
}

interface PosSessionState {
  session: CashierSession | null;
  login: (session: CashierSession) => void;
  logout: () => void;
}

export const usePosSessionStore = create<PosSessionState>()(
  persist(
    (set) => ({
      session: null,
      login: (session) => set({ session }),
      logout: () => set({ session: null }),
    }),
    { name: 'pospe-pos-session' },
  ),
);
