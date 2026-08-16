import { apiClient } from './client';

export interface LiveCategory {
  id: string;
  name: string;
  gstRate: number;
  description: string;
  imageUrl: string;
  skuCount: number;
}

export interface LiveBrand {
  id: string;
  name: string;
  countryOfOrigin: string;
  categoryIds: string[];
  skuCount: number;
}

interface ApiCategory {
  id: string;
  name: string;
  gstRate: string;
  description: string | null;
  imageUrl: string | null;
  skuCount: number;
}

interface ApiBrand {
  id: string;
  name: string;
  countryOfOrigin: string | null;
  categoryIds: string[];
  skuCount: number;
}

function toLiveCategory(c: ApiCategory): LiveCategory {
  return {
    id: c.id,
    name: c.name,
    gstRate: Number(c.gstRate),
    description: c.description ?? '',
    imageUrl: c.imageUrl ?? '',
    skuCount: c.skuCount,
  };
}

function toLiveBrand(b: ApiBrand): LiveBrand {
  return {
    id: b.id,
    name: b.name,
    countryOfOrigin: b.countryOfOrigin ?? '',
    categoryIds: b.categoryIds,
    skuCount: b.skuCount,
  };
}

export async function listCategories(): Promise<LiveCategory[]> {
  const categories = await apiClient.get<ApiCategory[]>('/api/inventory/categories');
  return categories.map(toLiveCategory);
}

export interface CategoryInput {
  name: string;
  gstRate?: number;
  description?: string;
  imageUrl?: string;
}

export async function createCategory(input: CategoryInput): Promise<LiveCategory> {
  const category = await apiClient.post<ApiCategory>('/api/inventory/categories', input);
  return toLiveCategory(category);
}

export async function updateCategory(id: string, input: CategoryInput): Promise<LiveCategory> {
  const category = await apiClient.put<ApiCategory>(`/api/inventory/categories/${id}`, input);
  return toLiveCategory(category);
}

export async function listBrands(): Promise<LiveBrand[]> {
  const brands = await apiClient.get<ApiBrand[]>('/api/inventory/brands');
  return brands.map(toLiveBrand);
}

export interface BrandInput {
  name: string;
  countryOfOrigin?: string;
  categoryIds?: string[];
}

export async function createBrand(input: BrandInput): Promise<LiveBrand> {
  const brand = await apiClient.post<ApiBrand>('/api/inventory/brands', input);
  return toLiveBrand(brand);
}

export async function updateBrand(id: string, input: BrandInput): Promise<LiveBrand> {
  const brand = await apiClient.put<ApiBrand>(`/api/inventory/brands/${id}`, input);
  return toLiveBrand(brand);
}
