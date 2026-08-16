import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '@pospe/permissions';

export interface AuthUser {
  name: string;
  email: string;
  role: Role;
}

interface AuthState {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const defaultUser: AuthUser = {
  name: 'Alexander Wright',
  email: 'admin@apexsupermarket.com',
  role: 'tenant_owner',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: defaultUser,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: 'pospe-auth' },
  ),
);
