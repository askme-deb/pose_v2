import { ApiClient } from '@pospe/api-client';
import { useAuthStore } from '../../store/useAuthStore';
import { useTenantStore } from '../../store/useTenantStore';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => useAuthStore.getState().token,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokens: ({ token, refreshToken }) => useAuthStore.getState().setTokens(token, refreshToken),
  onUnauthorized: () => useAuthStore.getState().logout(),
  // Every request is scoped to the branch picked in the header. The services
  // check it belongs to the signed-in tenant before using it.
  getHeaders: () => ({ 'x-store-id': useTenantStore.getState().branchId ?? undefined }),
});

/** Ends the session server-side (revokes refresh tokens), then locally. */
export async function signOut() {
  try {
    if (useAuthStore.getState().token) await apiClient.post('/api/auth/logout', {});
  } catch {
    // Already expired/revoked — signing out locally is all that's left.
  } finally {
    useAuthStore.getState().logout();
  }
}
