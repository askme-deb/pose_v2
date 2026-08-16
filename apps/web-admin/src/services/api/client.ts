import { ApiClient } from '@pospe/api-client';

export const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000',
});
