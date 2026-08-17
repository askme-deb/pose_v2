import { apiClient } from './client';

export interface LiveCategory {
  id: string;
  name: string;
}

interface ApiCategory {
  id: string;
  name: string;
}

export async function listCategories(): Promise<LiveCategory[]> {
  const categories = await apiClient.get<ApiCategory[]>('/api/inventory/categories');
  return categories.map((c) => ({ id: c.id, name: c.name }));
}
