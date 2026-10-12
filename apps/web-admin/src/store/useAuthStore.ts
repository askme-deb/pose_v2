import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '@pospe/permissions';

export interface AuthUser {
  name: string;
  email: string;
  role: Role;
  /** Filled in at sign-in; older stored sessions get them from /api/auth/me. */
  tenantId?: string;
  tenantName?: string;
  /** The user's default branch (assigned store, else the primary one). */
  storeId?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  login: (user: AuthUser, token?: string, refreshToken?: string) => void;
  setTokens: (token: string, refreshToken: string) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      login: (user, token, refreshToken) => set({ user, token: token ?? null, refreshToken: refreshToken ?? null }),
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      updateUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
      logout: () => set({ user: null, token: null, refreshToken: null }),
    }),
    {
      name: 'pospe-auth',
      // v0 shipped a hardcoded demo user with no token; v1 had no refresh
      // token. Either way, start from a clean signed-out state.
      version: 2,
      migrate: () => ({ user: null, token: null, refreshToken: null }),
    },
  ),
);
