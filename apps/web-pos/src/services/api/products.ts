import { apiClient } from './client';

export interface LiveProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  categoryName: string;
  gstRate: number;
  price: number;
  stockQty: number;
  imageUrl: string;
}

interface ApiProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  price: string;
  gstRate: string;
  imageUrl: string | null;
  stockQty: number;
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
    price: Number(p.price),
    stockQty: p.stockQty,
    imageUrl: p.imageUrl ?? '',
  };
}

export async function listProducts(): Promise<LiveProduct[]> {
  const products = await apiClient.get<ApiProduct[]>('/api/inventory/products');
  return products.map(toLiveProduct);
}
