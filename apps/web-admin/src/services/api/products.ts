import { apiClient } from './client';

export interface LiveProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  categoryName: string;
  gstRate: number;
  sellingPrice: number;
  costPrice: number;
  stockQty: number;
  minThreshold: number;
  imageUrl: string;
}

export interface LiveCategory {
  id: string;
  name: string;
}

interface ApiProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  price: string;
  costPrice: string;
  gstRate: string;
  imageUrl: string | null;
  stockQty: number;
  minThreshold: number;
}

interface ApiCategory {
  id: string;
  name: string;
}

function toLiveProduct(p: ApiProduct): LiveProduct {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode ?? '',
    categoryId: p.categoryId ?? '',
    categoryName: p.category?.name ?? 'Uncategorized',
    gstRate: Number(p.gstRate),
    sellingPrice: Number(p.price),
    costPrice: Number(p.costPrice),
    stockQty: p.stockQty,
    minThreshold: p.minThreshold,
    imageUrl: p.imageUrl ?? '',
  };
}

export function stockStatus(p: Pick<LiveProduct, 'stockQty' | 'minThreshold'>): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (p.stockQty === 0) return 'out-of-stock';
  if (p.stockQty <= p.minThreshold) return 'low-stock';
  return 'in-stock';
}

export async function listProducts(): Promise<LiveProduct[]> {
  const products = await apiClient.get<ApiProduct[]>('/api/inventory/products');
  return products.map(toLiveProduct);
}

export async function listCategories(): Promise<LiveCategory[]> {
  return apiClient.get<ApiCategory[]>('/api/inventory/categories');
}

export interface ProductInput {
  name: string;
  sku: string;
  barcode?: string;
  categoryId?: string;
  price: number;
  costPrice?: number;
  gstRate?: number;
  imageUrl?: string;
  stockQty?: number;
  minThreshold?: number;
}

export async function createProduct(input: ProductInput): Promise<LiveProduct> {
  const product = await apiClient.post<ApiProduct>('/api/inventory/products', input);
  return toLiveProduct(product);
}

export async function updateProduct(id: string, input: ProductInput): Promise<LiveProduct> {
  const product = await apiClient.put<ApiProduct>(`/api/inventory/products/${id}`, input);
  return toLiveProduct(product);
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/api/inventory/products/${id}`);
}
