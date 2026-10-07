import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Which store this physical terminal belongs to. Set once by a manager
 * ("pair terminal") and kept across cashier logouts — PIN login is only
 * accepted for the staff of this one store.
 */
interface TerminalState {
  storeId: string | null;
  storeName: string | null;
  pair: (storeId: string, storeName: string) => void;
  unpair: () => void;
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set) => ({
      storeId: null,
      storeName: null,
      pair: (storeId, storeName) => set({ storeId, storeName }),
      unpair: () => set({ storeId: null, storeName: null }),
    }),
    { name: 'pospe-terminal' },
  ),
);
