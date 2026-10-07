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
  trackBatches: boolean;
  trackSerials: boolean;
  isBundle: boolean;
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
  trackBatches: boolean;
  trackSerials: boolean;
  isBundle: boolean;
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
    imageUrl: resolveImageUrl(p.imageUrl),
    trackBatches: p.trackBatches,
    trackSerials: p.trackSerials,
    isBundle: p.isBundle,
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
  trackBatches?: boolean;
  trackSerials?: boolean;
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

/** Uploads a product photo (JPEG/PNG/WebP, ≤5 MB) to object storage. */
export async function uploadProductImage(id: string, file: File): Promise<LiveProduct> {
  const form = new FormData();
  form.append('image', file);
  const product = await apiClient.upload<ApiProduct>(`/api/inventory/products/${id}/image`, form);
  return toLiveProduct(product);
}

// Locally stored uploads come back as gateway-relative paths
// (/api/inventory/uploads/...); S3/CDN uploads are already absolute.
function resolveImageUrl(url: string | null): string {
  if (!url) return '';
  if (url.startsWith('/')) return `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}${url}`;
  return url;
}
