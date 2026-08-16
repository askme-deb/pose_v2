import { create } from 'zustand';

interface TenantState {
  tenant: string;
  branch: string;
  tenants: string[];
  branches: string[];
  selectTenant: (tenant: string) => void;
  selectBranch: (branch: string) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenant: 'Apex Supermarket Chain',
  branch: 'Downtown Flagship',
  tenants: ['Apex Supermarket Chain', 'Coastal Retail Group', 'Metro Fashion House'],
  branches: ['Downtown Flagship', 'Westside Express', 'Airport Road Outlet', 'Central Warehouse'],
  selectTenant: (tenant) => set({ tenant }),
  selectBranch: (branch) => set({ branch }),
}));
