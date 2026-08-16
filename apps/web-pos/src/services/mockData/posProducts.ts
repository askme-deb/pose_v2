export interface PosCategory {
  id: string;
  label: string;
  emoji: string;
}

export const posCategories: PosCategory[] = [
  { id: 'dairy', label: 'Dairy & Milk', emoji: '🥛' },
  { id: 'confectionery', label: 'Confectionery', emoji: '🍫' },
  { id: 'gourmet', label: 'Gourmet & Oils', emoji: '🫒' },
  { id: 'beverages', label: 'Beverages', emoji: '🥤' },
  { id: 'bakery', label: 'Bakery & Nuts', emoji: '🍞' },
  { id: 'fresh', label: 'Fresh Goods', emoji: '🥚' },
];

export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  gstRate: number;
  category: string;
  emoji: string;
}

export const posProducts: PosProduct[] = [
  { id: 'pp-001', name: 'Amul Gold Milk 1L', sku: 'AML-GLD-1L', price: 68, gstRate: 5, category: 'dairy', emoji: '🥛' },
  { id: 'pp-002', name: 'Amul Processed Cheese 200g', sku: 'AML-CHZ-200', price: 125, gstRate: 12, category: 'dairy', emoji: '🧀' },
  { id: 'pp-003', name: 'Amul Fresh Paneer 200g', sku: 'AML-PNR-200', price: 90, gstRate: 5, category: 'dairy', emoji: '🧈' },
  { id: 'pp-004', name: 'Mother Dairy Curd 400g', sku: 'MTD-CRD-400', price: 42, gstRate: 5, category: 'dairy', emoji: '🥣' },
  { id: 'pp-005', name: 'Cadbury Dairy Milk Silk 60g', sku: 'CDB-DMS-60', price: 90, gstRate: 18, category: 'confectionery', emoji: '🍫' },
  { id: 'pp-006', name: 'Nestle Munch 4-Pack', sku: 'NSC-MNC-4PK', price: 50, gstRate: 18, category: 'confectionery', emoji: '🍬' },
  { id: 'pp-007', name: "Haldiram's Soan Papdi 500g", sku: 'HLD-SNP-500', price: 180, gstRate: 12, category: 'confectionery', emoji: '🍡' },
  { id: 'pp-008', name: "Haldiram's Aloo Bhujia 200g", sku: 'HLD-ALB-200', price: 65, gstRate: 12, category: 'gourmet', emoji: '🥨' },
  { id: 'pp-009', name: 'Fortune Sunflower Oil 1L', sku: 'FRT-SNF-1L', price: 148, gstRate: 5, category: 'gourmet', emoji: '🫒' },
  { id: 'pp-010', name: 'Tata Salt Iodized 1kg', sku: 'TT-SLT-1KG', price: 28, gstRate: 5, category: 'gourmet', emoji: '🧂' },
  { id: 'pp-011', name: 'Nescafe Classic Coffee 100g', sku: 'NSC-CLC-100', price: 285, gstRate: 18, category: 'beverages', emoji: '☕' },
  { id: 'pp-012', name: 'Coca-Cola 750ml Bottle', sku: 'COC-750-BTL', price: 40, gstRate: 18, category: 'beverages', emoji: '🥤' },
  { id: 'pp-013', name: 'Real Mixed Fruit Juice 1L', sku: 'RL-MFJ-1L', price: 110, gstRate: 12, category: 'beverages', emoji: '🧃' },
  { id: 'pp-014', name: 'Britannia Good Day Cashew 200g', sku: 'BRT-GDC-200', price: 45, gstRate: 5, category: 'bakery', emoji: '🍪' },
  { id: 'pp-015', name: 'Britannia Brown Bread 400g', sku: 'BRT-BRB-400', price: 55, gstRate: 0, category: 'bakery', emoji: '🍞' },
  { id: 'pp-016', name: 'Mixed Dry Fruits 250g', sku: 'GRM-DRF-250', price: 210, gstRate: 12, category: 'bakery', emoji: '🥜' },
  { id: 'pp-017', name: 'Fresh Alphonso Mango 1kg', sku: 'FRS-MNG-1KG', price: 220, gstRate: 0, category: 'fresh', emoji: '🥭' },
  { id: 'pp-018', name: 'Fresh Farm Tomatoes 1kg', sku: 'FRS-TMT-1KG', price: 40, gstRate: 0, category: 'fresh', emoji: '🍅' },
  { id: 'pp-019', name: 'Farm Fresh Eggs (12 pcs)', sku: 'FRS-EGG-12', price: 84, gstRate: 0, category: 'fresh', emoji: '🥚' },
];
