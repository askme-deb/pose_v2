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
  token: string | null;
  login: (user: AuthUser, token?: string) => void;
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
      token: null,
      login: (user, token) => set({ user, token: token ?? null }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'pospe-auth' },
  ),
);
