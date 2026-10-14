import { ApiClient } from '@pospe/api-client';
import { useAuthStore } from '../../store/useAuthStore';
import { useTenantStore } from '../../store/useTenantStore';
import type { Role } from '@pospe/permissions';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => useAuthStore.getState().token,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokens: ({ token, refreshToken }) => useAuthStore.getState().setTokens(token, refreshToken),
  // A dead impersonation session falls back to the admin's own session.
  onUnauthorized: () => {
    const auth = useAuthStore.getState();
    if (auth.impersonator) auth.endImpersonation();
    else auth.logout();
  },
  // Every request is scoped to the branch picked in the header. The services
  // check it belongs to the signed-in tenant before using it.
  getHeaders: () => ({ 'x-store-id': useTenantStore.getState().branchId ?? undefined }),
});

interface ImpersonationResponse {
  token: string;
  refreshToken: string;
  user: { name: string; email: string; role: Role; tenantId?: string; tenantName?: string; storeId?: string | null };
}

/** Platform admin: continue as the tenant's owner (audited server-side). */
export async function impersonateTenant(tenantId: string) {
  const res = await apiClient.post<ImpersonationResponse>('/api/auth/impersonate', { tenantId });
  const { name, email, role, tenantName, storeId } = res.user;
  useTenantStore.getState().reset();
  useAuthStore.getState().startImpersonation({ name, email, role, tenantId: res.user.tenantId, tenantName, storeId }, res.token, res.refreshToken);
}

/**
 * Leaves an impersonated session: revokes just that session (by its refresh
 * token, so the real owner stays signed in everywhere) and restores the
 * admin's own session.
 */
export async function exitImpersonation() {
  const { token, refreshToken } = useAuthStore.getState();
  try {
    if (token && refreshToken) await apiClient.post('/api/auth/logout', { refreshToken });
  } catch {
    // Already expired: nothing left to revoke.
  } finally {
    useTenantStore.getState().reset();
    useAuthStore.getState().endImpersonation();
  }
}

/** Ends the session server-side (revokes refresh tokens), then locally. */
export async function signOut() {
  if (useAuthStore.getState().impersonator) return exitImpersonation();
  try {
    if (useAuthStore.getState().token) await apiClient.post('/api/auth/logout', {});
  } catch {
    // Already expired/revoked — signing out locally is all that's left.
  } finally {
    useAuthStore.getState().logout();
  }
}
