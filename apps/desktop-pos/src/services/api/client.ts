import { ApiClient } from '@pospe/api-client';
import { usePosSessionStore } from '../../store/usePosSessionStore';

export const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000',
  getToken: () => usePosSessionStore.getState().token,
  getRefreshToken: () => usePosSessionStore.getState().refreshToken,
  onTokens: ({ token, refreshToken }) => usePosSessionStore.getState().setTokens(token, refreshToken),
  onUnauthorized: () => usePosSessionStore.getState().logout(),
});

/** Ends the cashier session server-side (revokes refresh tokens), then locally. */
export async function signOut() {
  try {
    if (usePosSessionStore.getState().token) await apiClient.post('/api/auth/logout', {});
  } catch {
    // Already expired, or offline — the local sign-out below still applies.
  } finally {
    usePosSessionStore.getState().logout();
  }
}
