export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  brandId: string;
  gstRate: number;
  sellingPrice: number;
  costPrice: number;
  stockQty: number;
  minThreshold: number;
  imageUrl: string;
}

export const products: Product[] = [
  { id: 'prd-001', name: 'Amul Gold Milk 1L', sku: 'AML-GLD-1L', barcode: '8901063511019', categoryId: 'cat-dairy', brandId: 'brand-amul', gstRate: 5, sellingPrice: 68, costPrice: 58, stockQty: 240, minThreshold: 50, imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200' },
  { id: 'prd-002', name: 'Amul Processed Cheese 200g', sku: 'AML-CHZ-200', barcode: '8901063511026', categoryId: 'cat-dairy', brandId: 'brand-amul', gstRate: 12, sellingPrice: 125, costPrice: 98, stockQty: 86, minThreshold: 30, imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200' },
  { id: 'prd-003', name: 'Cadbury Dairy Milk Silk 60g', sku: 'CDB-DMS-60', barcode: '7622210292319', categoryId: 'cat-confectionery', brandId: 'brand-cadbury', gstRate: 18, sellingPrice: 90, costPrice: 72, stockQty: 12, minThreshold: 25, imageUrl: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200' },
  { id: 'prd-004', name: 'Nescafe Classic Coffee 100g', sku: 'NSC-CLC-100', barcode: '7613036021094', categoryId: 'cat-beverages', brandId: 'brand-nestle', gstRate: 18, sellingPrice: 285, costPrice: 231, stockQty: 54, minThreshold: 20, imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200' },
  { id: 'prd-005', name: 'Britannia Good Day Cashew 200g', sku: 'BRT-GDC-200', barcode: '8901063017450', categoryId: 'cat-bakery', brandId: 'brand-britannia', gstRate: 5, sellingPrice: 45, costPrice: 36, stockQty: 0, minThreshold: 40, imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=200' },
  { id: 'prd-006', name: 'Coca-Cola 750ml Bottle', sku: 'COC-750-BTL', barcode: '5449000000996', categoryId: 'cat-beverages', brandId: 'brand-cocacola', gstRate: 18, sellingPrice: 40, costPrice: 31, stockQty: 320, minThreshold: 80, imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=200' },
  { id: 'prd-007', name: "Haldiram's Aloo Bhujia 200g", sku: 'HLD-ALB-200', barcode: '8901138511209', categoryId: 'cat-gourmet', brandId: 'brand-haldirams', gstRate: 12, sellingPrice: 65, costPrice: 50, stockQty: 18, minThreshold: 30, imageUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200' },
  { id: 'prd-008', name: 'Amul Fresh Paneer 200g', sku: 'AML-PNR-200', barcode: '8901063511033', categoryId: 'cat-dairy', brandId: 'brand-amul', gstRate: 5, sellingPrice: 90, costPrice: 74, stockQty: 46, minThreshold: 25, imageUrl: 'https://images.unsplash.com/photo-1631206753348-db44968fd440?w=200' },
  { id: 'prd-009', name: 'Nestle Munch 4-Pack', sku: 'NSC-MNC-4PK', barcode: '7613036028529', categoryId: 'cat-confectionery', brandId: 'brand-nestle', gstRate: 18, sellingPrice: 50, costPrice: 39, stockQty: 8, minThreshold: 20, imageUrl: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=200' },
  { id: 'prd-010', name: 'Britannia Brown Bread 400g', sku: 'BRT-BRB-400', barcode: '8901063017467', categoryId: 'cat-bakery', brandId: 'brand-britannia', gstRate: 0, sellingPrice: 55, costPrice: 42, stockQty: 62, minThreshold: 30, imageUrl: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=200' },
  { id: 'prd-011', name: 'Fresh Alphonso Mango 1kg', sku: 'FRS-MNG-1KG', barcode: '2000000000019', categoryId: 'cat-fresh', brandId: 'brand-haldirams', gstRate: 0, sellingPrice: 220, costPrice: 165, stockQty: 34, minThreshold: 15, imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=200' },
  { id: 'prd-012', name: 'Coca-Cola Zero 300ml Can', sku: 'COC-ZR-300', barcode: '5449000131805', categoryId: 'cat-beverages', brandId: 'brand-cocacola', gstRate: 18, sellingPrice: 45, costPrice: 35, stockQty: 5, minThreshold: 40, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200' },
  { id: 'prd-013', name: "Haldiram's Soan Papdi 500g", sku: 'HLD-SNP-500', barcode: '8901138511322', categoryId: 'cat-gourmet', brandId: 'brand-haldirams', gstRate: 12, sellingPrice: 180, costPrice: 140, stockQty: 0, minThreshold: 20, imageUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=200' },
  { id: 'prd-014', name: 'Fresh Farm Tomatoes 1kg', sku: 'FRS-TMT-1KG', barcode: '2000000000026', categoryId: 'cat-fresh', brandId: 'brand-haldirams', gstRate: 0, sellingPrice: 40, costPrice: 28, stockQty: 120, minThreshold: 30, imageUrl: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=200' },
];

export const productOptions = products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }));

export function stockStatus(p: Product): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (p.stockQty === 0) return 'out-of-stock';
  if (p.stockQty <= p.minThreshold) return 'low-stock';
  return 'in-stock';
}
