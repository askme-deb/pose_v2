import { create } from 'zustand';
import { listPendingSales } from '../db/offlineDb';

interface SyncStatusState {
  online: boolean;
  pendingCount: number;
  failedCount: number;
  setOnline: (online: boolean) => void;
  refreshCounts: () => Promise<void>;
}

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: 0,
  failedCount: 0,
  setOnline: (online) => set({ online }),
  refreshCounts: async () => {
    const sales = await listPendingSales();
    set({
      pendingCount: sales.filter((s) => s.status === 'pending').length,
      failedCount: sales.filter((s) => s.status === 'failed').length,
    });
  },
}));
