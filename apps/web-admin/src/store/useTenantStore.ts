import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Branch {
  id: string;
  name: string;
  code: string;
}

interface BranchState {
  /** The branches of the signed-in business (loaded after sign-in). */
  branches: Branch[];
  /** The branch every screen and request is scoped to; null until branches load. */
  branchId: string | null;
  /** The tenant the remembered choice belongs to, so one business's pick never leaks into another's. */
  ownerTenantId: string | null;
  setBranches: (branches: Branch[], tenantId: string | undefined, defaultBranchId: string | null | undefined) => void;
  selectBranch: (branchId: string) => void;
  reset: () => void;
}

/**
 * Branch selection. (The business itself isn't selectable here: the signed-in
 * user belongs to exactly one tenant, which the server takes from their token.)
 */
export const useTenantStore = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: [],
      branchId: null,
      ownerTenantId: null,
      setBranches: (branches, tenantId, defaultBranchId) => {
        const { branchId, ownerTenantId } = get();
        const remembered = ownerTenantId === (tenantId ?? null) ? branchId : null;
        const valid = (id: string | null | undefined) => (id && branches.some((b) => b.id === id) ? id : null);
        set({
          branches,
          ownerTenantId: tenantId ?? null,
          branchId: valid(remembered) ?? valid(defaultBranchId) ?? branches[0]?.id ?? null,
        });
      },
      selectBranch: (branchId) => set({ branchId }),
      reset: () => set({ branches: [], branchId: null, ownerTenantId: null }),
    }),
    {
      name: 'pospe-branch',
      // Only the choice is remembered; the list is always re-fetched.
      partialize: (s) => ({ branchId: s.branchId, ownerTenantId: s.ownerTenantId }),
    },
  ),
);
