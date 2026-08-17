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
  login: (session: CashierSession, token?: string) => void;
  logout: () => void;
}

export const usePosSessionStore = create<PosSessionState>()(
  persist(
    (set) => ({
      session: null,
      token: null,
      login: (session, token) => set({ session, token: token ?? null }),
      logout: () => set({ session: null, token: null }),
    }),
    { name: 'pospe-pos-session' },
  ),
);
