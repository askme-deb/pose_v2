import { ApiClient } from '@pospe/api-client';
import { useAuthStore } from '../../store/useAuthStore';

export const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000',
  getToken: () => useAuthStore.getState().token,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokens: ({ token, refreshToken }) => useAuthStore.getState().setTokens(token, refreshToken),
  onUnauthorized: () => useAuthStore.getState().logout(),
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
