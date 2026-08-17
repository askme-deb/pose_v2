import { ApiClient } from '@pospe/api-client';
import { usePosSessionStore } from '../../store/usePosSessionStore';

export const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000',
  getToken: () => usePosSessionStore.getState().token,
});
