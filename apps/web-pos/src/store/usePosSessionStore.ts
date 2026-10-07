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
  refreshToken: string | null;
  storeId: string | null;
  login: (session: CashierSession, token?: string, storeId?: string | null, refreshToken?: string) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
}

export const usePosSessionStore = create<PosSessionState>()(
  persist(
    (set) => ({
      session: null,
      token: null,
      refreshToken: null,
      storeId: null,
      login: (session, token, storeId, refreshToken) =>
        set({ session, token: token ?? null, storeId: storeId ?? null, refreshToken: refreshToken ?? null }),
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      logout: () => set({ session: null, token: null, refreshToken: null, storeId: null }),
    }),
    { name: 'pospe-pos-session' },
  ),
);
