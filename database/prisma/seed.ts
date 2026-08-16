import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'apex-supermarket' },
    update: {},
    create: {
      name: 'Apex Supermarket Chain',
      slug: 'apex-supermarket',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
    },
  });

  const categoryDefs = [
    { name: 'Dairy', key: 'dairy' },
    { name: 'Confectionery', key: 'confectionery' },
    { name: 'Gourmet', key: 'gourmet' },
    { name: 'Beverages', key: 'beverages' },
    { name: 'Bakery', key: 'bakery' },
    { name: 'Fresh Goods', key: 'fresh' },
  ];

  const categories: Record<string, string> = {};
  for (const c of categoryDefs) {
    const existing = await prisma.category.findFirst({ where: { tenantId: tenant.id, name: c.name } });
    const category =
      existing ?? (await prisma.category.create({ data: { tenantId: tenant.id, name: c.name } }));
    categories[c.key] = category.id;
  }

  const products = [
    { name: 'Amul Gold Milk 1L', sku: 'AML-GLD-1L', barcode: '8901063511019', category: 'dairy', price: 68, mrp: 72, costPrice: 58, gstRate: 5, stockQty: 240, minThreshold: 50, imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200' },
    { name: 'Amul Processed Cheese 200g', sku: 'AML-CHZ-200', barcode: '8901063511026', category: 'dairy', price: 125, mrp: 135, costPrice: 98, gstRate: 12, stockQty: 86, minThreshold: 30, imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200' },
    { name: 'Cadbury Dairy Milk Silk 60g', sku: 'CDB-DMS-60', barcode: '7622210292319', category: 'confectionery', price: 90, mrp: 95, costPrice: 72, gstRate: 18, stockQty: 12, minThreshold: 25, imageUrl: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200' },
    { name: 'Nescafe Classic Coffee 100g', sku: 'NSC-CLC-100', barcode: '7613036021094', category: 'beverages', price: 285, mrp: 299, costPrice: 231, gstRate: 18, stockQty: 54, minThreshold: 20, imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200' },
    { name: 'Britannia Good Day Cashew 200g', sku: 'BRT-GDC-200', barcode: '8901063017450', category: 'bakery', price: 45, mrp: 49, costPrice: 36, gstRate: 5, stockQty: 0, minThreshold: 40, imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=200' },
    { name: 'Coca-Cola 750ml Bottle', sku: 'COC-750-BTL', barcode: '5449000000996', category: 'beverages', price: 40, mrp: 45, costPrice: 31, gstRate: 18, stockQty: 320, minThreshold: 80, imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=200' },
    { name: "Haldiram's Aloo Bhujia 200g", sku: 'HLD-ALB-200', barcode: '8901138511209', category: 'gourmet', price: 65, mrp: 70, costPrice: 50, gstRate: 12, stockQty: 18, minThreshold: 30, imageUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200' },
    { name: 'Amul Fresh Paneer 200g', sku: 'AML-PNR-200', barcode: '8901063511033', category: 'dairy', price: 90, mrp: 95, costPrice: 74, gstRate: 5, stockQty: 46, minThreshold: 25, imageUrl: 'https://images.unsplash.com/photo-1631206753348-db44968fd440?w=200' },
    { name: 'Nestle Munch 4-Pack', sku: 'NSC-MNC-4PK', barcode: '7613036028529', category: 'confectionery', price: 50, mrp: 55, costPrice: 39, gstRate: 18, stockQty: 8, minThreshold: 20, imageUrl: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=200' },
    { name: 'Britannia Brown Bread 400g', sku: 'BRT-BRB-400', barcode: '8901063017467', category: 'bakery', price: 55, mrp: 58, costPrice: 42, gstRate: 0, stockQty: 62, minThreshold: 30, imageUrl: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=200' },
    { name: 'Fresh Alphonso Mango 1kg', sku: 'FRS-MNG-1KG', barcode: '2000000000019', category: 'fresh', price: 220, mrp: 240, costPrice: 165, gstRate: 0, stockQty: 34, minThreshold: 15, imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=200' },
    { name: 'Coca-Cola Zero 300ml Can', sku: 'COC-ZR-300', barcode: '5449000131805', category: 'beverages', price: 45, mrp: 49, costPrice: 35, gstRate: 18, stockQty: 5, minThreshold: 40, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200' },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: p.sku } },
      update: {},
      create: {
        tenantId: tenant.id,
        categoryId: categories[p.category],
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        price: p.price,
        mrp: p.mrp,
        costPrice: p.costPrice,
        gstRate: p.gstRate,
        stockQty: p.stockQty,
        minThreshold: p.minThreshold,
        imageUrl: p.imageUrl,
      },
    });
  }

  console.log(`Seeded tenant "${tenant.name}" with ${categoryDefs.length} categories and ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
