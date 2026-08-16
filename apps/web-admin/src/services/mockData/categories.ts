export interface Category {
  id: string;
  name: string;
  gstRate: number;
  description: string;
  imageUrl: string;
  skuCount: number;
}

export const categories: Category[] = [
  { id: 'cat-dairy', name: 'Dairy', gstRate: 5, description: 'Milk, cheese, curd and paneer products', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200', skuCount: 42 },
  { id: 'cat-confectionery', name: 'Confectionery', gstRate: 18, description: 'Chocolates, candies and sweets', imageUrl: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=200', skuCount: 58 },
  { id: 'cat-gourmet', name: 'Gourmet', gstRate: 12, description: 'Imported and specialty food items', imageUrl: 'https://images.unsplash.com/photo-1543168256-418811576931?w=200', skuCount: 27 },
  { id: 'cat-beverages', name: 'Beverages', gstRate: 18, description: 'Soft drinks, juices and packaged water', imageUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200', skuCount: 63 },
  { id: 'cat-bakery', name: 'Bakery', gstRate: 5, description: 'Breads, cakes and pastries', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200', skuCount: 34 },
  { id: 'cat-fresh', name: 'Fresh Goods', gstRate: 0, description: 'Fruits, vegetables and fresh produce', imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200', skuCount: 71 },
];

export const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
