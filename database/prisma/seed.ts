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
    { name: 'Dairy', key: 'dairy', gstRate: 5, description: 'Milk, cheese, curd and paneer products', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200' },
    { name: 'Confectionery', key: 'confectionery', gstRate: 18, description: 'Chocolates, candies and sweets', imageUrl: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=200' },
    { name: 'Gourmet', key: 'gourmet', gstRate: 12, description: 'Imported and specialty food items', imageUrl: 'https://images.unsplash.com/photo-1543168256-418811576931?w=200' },
    { name: 'Beverages', key: 'beverages', gstRate: 18, description: 'Soft drinks, juices and packaged water', imageUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200' },
    { name: 'Bakery', key: 'bakery', gstRate: 5, description: 'Breads, cakes and pastries', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200' },
    { name: 'Fresh Goods', key: 'fresh', gstRate: 0, description: 'Fruits, vegetables and fresh produce', imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200' },
  ];

  const categories: Record<string, string> = {};
  for (const c of categoryDefs) {
    const existing = await prisma.category.findFirst({ where: { tenantId: tenant.id, name: c.name } });
    const category =
      existing ??
      (await prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: c.name,
          gstRate: c.gstRate,
          description: c.description,
          imageUrl: c.imageUrl,
        },
      }));
    categories[c.key] = category.id;
  }

  const brandDefs = [
    { name: 'Amul', countryOfOrigin: 'India', categoryKeys: ['dairy'] },
    { name: 'Cadbury', countryOfOrigin: 'United Kingdom', categoryKeys: ['confectionery'] },
    { name: 'Nestle', countryOfOrigin: 'Switzerland', categoryKeys: ['confectionery', 'beverages'] },
    { name: 'Britannia', countryOfOrigin: 'India', categoryKeys: ['bakery', 'confectionery'] },
    { name: 'Coca-Cola', countryOfOrigin: 'United States', categoryKeys: ['beverages'] },
    { name: "Haldiram's", countryOfOrigin: 'India', categoryKeys: ['gourmet', 'confectionery'] },
  ];

  for (const b of brandDefs) {
    const existing = await prisma.brand.findFirst({ where: { tenantId: tenant.id, name: b.name } });
    if (!existing) {
      await prisma.brand.create({
        data: {
          tenantId: tenant.id,
          name: b.name,
          countryOfOrigin: b.countryOfOrigin,
          categoryIds: b.categoryKeys.map((k) => categories[k]),
        },
      });
    }
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

  const productIdBySku: Record<string, string> = {};
  for (const p of products) {
    const product = await prisma.product.upsert({
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
    productIdBySku[p.sku] = product.id;
  }

  // Illustrative audit history only — these are inserted directly (not via the
  // service's increment-on-create logic) so they don't perturb the stockQty
  // values seeded above.
  const adjustmentDefs = [
    { sku: 'BRT-GDC-200', action: 'SUBTRACT' as const, qty: 40, reasonCode: 'Expired / Damaged', auditor: 'Rohit Sharma', status: 'APPROVED' as const, createdAt: '2026-08-01T10:15:00+05:30' },
    { sku: 'COC-ZR-300', action: 'SUBTRACT' as const, qty: 15, reasonCode: 'Shrinkage / Missing', auditor: 'Priya Nair', status: 'APPROVED' as const, createdAt: '2026-08-03T14:30:00+05:30' },
    { sku: 'NSC-MNC-4PK', action: 'SUBTRACT' as const, qty: 12, reasonCode: 'Store Consumption / Tasting', auditor: 'Manager Alex', status: 'PENDING' as const, createdAt: '2026-08-05T09:00:00+05:30' },
    { sku: 'CDB-DMS-60', action: 'SUBTRACT' as const, qty: 8, reasonCode: 'Expired / Damaged', auditor: 'Rohit Sharma', status: 'APPROVED' as const, createdAt: '2026-08-06T11:45:00+05:30' },
    { sku: 'AML-GLD-1L', action: 'ADD' as const, qty: 60, reasonCode: 'Audit Variance Correction', auditor: 'Sunita Rao', status: 'APPROVED' as const, createdAt: '2026-08-07T08:20:00+05:30' },
    { sku: 'HLD-ALB-200', action: 'SUBTRACT' as const, qty: 10, reasonCode: 'Shrinkage / Missing', auditor: 'Priya Nair', status: 'PENDING' as const, createdAt: '2026-08-09T16:10:00+05:30' },
    { sku: 'AML-CHZ-200', action: 'ADD' as const, qty: 20, reasonCode: 'Audit Variance Correction', auditor: 'Sunita Rao', status: 'APPROVED' as const, createdAt: '2026-08-12T10:30:00+05:30' },
    { sku: 'FRS-MNG-1KG', action: 'SUBTRACT' as const, qty: 18, reasonCode: 'Shrinkage / Missing', auditor: 'Rohit Sharma', status: 'PENDING' as const, createdAt: '2026-08-14T09:50:00+05:30' },
    { sku: 'COC-750-BTL', action: 'ADD' as const, qty: 100, reasonCode: 'Audit Variance Correction', auditor: 'Priya Nair', status: 'APPROVED' as const, createdAt: '2026-08-15T13:15:00+05:30' },
  ];

  for (const a of adjustmentDefs) {
    const productId = productIdBySku[a.sku];
    const existing = await prisma.stockAdjustment.findFirst({ where: { tenantId: tenant.id, productId, createdAt: new Date(a.createdAt) } });
    if (!existing) {
      const product = products.find((p) => p.sku === a.sku)!;
      const signedQty = a.action === 'ADD' ? a.qty : -a.qty;
      await prisma.stockAdjustment.create({
        data: {
          tenantId: tenant.id,
          productId,
          action: a.action,
          qty: a.qty,
          reasonCode: a.reasonCode,
          auditor: a.auditor,
          valueImpact: signedQty * product.costPrice,
          status: a.status,
          createdAt: new Date(a.createdAt),
        },
      });
    }
  }

  const existingStore = await prisma.store.findFirst({ where: { tenantId: tenant.id, name: 'Downtown Flagship' } });
  const store =
    existingStore ??
    (await prisma.store.create({
      data: {
        tenantId: tenant.id,
        name: 'Downtown Flagship',
        address: '142 MG Road, Bengaluru, Karnataka 560001',
        gstin: '27AAACA1234F1Z9',
      },
    }));

  // Same people who appear on the invoices below (tenantId+name is how they're
  // linked at seed time) — one customer list shared between CRM and the sales
  // ledger, rather than two disconnected mock datasets like the original prototype
  // had. Plus two loyalty-program-only members with no purchase history yet, to
  // show the empty-LTV case.
  const customerDefs = [
    { name: 'Aarav Kapoor', phone: '+91 98450 11221', email: 'aarav.kapoor@gmail.com', tier: 'STANDARD' as const, loyaltyPoints: 420 },
    { name: 'Meera Iyer', phone: '+91 98450 22332', email: 'meera.iyer@yahoo.in', tier: 'STANDARD' as const, loyaltyPoints: 200 },
    { name: 'Rohan Malhotra', phone: '+91 98450 33443', email: 'rohan.malhotra@gmail.com', tier: 'STANDARD' as const, loyaltyPoints: 460 },
    { name: 'Simran Kaur', phone: '+91 98450 44554', email: 'simran.kaur@outlook.com', tier: 'STANDARD' as const, loyaltyPoints: 100 },
    { name: 'Devansh Rao', phone: '+91 98450 55665', email: 'devansh.rao@gmail.com', tier: 'SILVER' as const, loyaltyPoints: 1450 },
    { name: 'Ananya Bose', phone: '+91 98450 66776', email: 'ananya.bose@rediffmail.com', tier: 'GOLD' as const, loyaltyPoints: 3820 },
    { name: 'Kabir Singh', phone: '+91 98450 77887', email: 'kabir.singh@hotmail.com', tier: 'STANDARD' as const, loyaltyPoints: 480 },
    { name: 'Neha Kulkarni', phone: '+91 98450 88998', email: 'neha.kulkarni@gmail.com', tier: 'SILVER' as const, loyaltyPoints: 1120 },
    { name: 'Vikram Sethi', phone: '+91 98300 44556', email: 'vikram.sethi@techcorp.in', tier: 'VIP_DIAMOND' as const, loyaltyPoints: 5240 },
    { name: 'Priya Sharma', phone: '+91 98765 43210', email: 'priya.sharma@gmail.com', tier: 'GOLD' as const, loyaltyPoints: 2100 },
  ];

  const customerIdByName: Record<string, string> = {};
  for (const c of customerDefs) {
    const existing = await prisma.customer.findFirst({ where: { tenantId: tenant.id, name: c.name } });
    const customer =
      existing ??
      (await prisma.customer.create({
        data: { tenantId: tenant.id, name: c.name, phone: c.phone, email: c.email, tier: c.tier, loyaltyPoints: c.loyaltyPoints },
      }));
    customerIdByName[c.name] = customer.id;
  }

  // Invoice totals are computed from real seeded product prices/GST rates rather
  // than hand-typed round numbers, so subtotal + tax actually equals total.
  function buildInvoiceItems(lines: { sku: string; qty: number }[]) {
    return lines.map(({ sku, qty }) => {
      const product = products.find((p) => p.sku === sku)!;
      const lineSubtotal = product.price * qty;
      const lineTax = Math.round(lineSubtotal * (product.gstRate / 100) * 100) / 100;
      return { productId: productIdBySku[sku], quantity: qty, price: product.price, gstRate: product.gstRate, total: lineSubtotal + lineTax, lineSubtotal, lineTax };
    });
  }

  const invoiceDefs = [
    { seq: 9821, customerName: 'Aarav Kapoor', paymentMethod: 'UPI' as const, status: 'PAID' as const, createdAt: '2026-08-16T09:12:00+05:30', lines: [{ sku: 'AML-GLD-1L', qty: 2 }, { sku: 'NSC-CLC-100', qty: 1 }] },
    { seq: 9822, customerName: 'Walk-in Customer', paymentMethod: 'CASH' as const, status: 'PAID' as const, createdAt: '2026-08-16T08:40:00+05:30', lines: [{ sku: 'COC-750-BTL', qty: 6 }, { sku: 'CDB-DMS-60', qty: 3 }] },
    { seq: 9823, customerName: 'Meera Iyer', paymentMethod: 'CARD' as const, status: 'PAID' as const, createdAt: '2026-08-15T19:05:00+05:30', lines: [{ sku: 'BRT-BRB-400', qty: 2 }, { sku: 'AML-PNR-200', qty: 1 }] },
    { seq: 9824, customerName: 'Rohan Malhotra', paymentMethod: 'UPI' as const, status: 'PAID' as const, createdAt: '2026-08-15T17:52:00+05:30', lines: [{ sku: 'HLD-ALB-200', qty: 4 }, { sku: 'NSC-MNC-4PK', qty: 2 }] },
    { seq: 9825, customerName: 'Walk-in Customer', paymentMethod: 'CASH' as const, status: 'PAID' as const, createdAt: '2026-08-15T16:20:00+05:30', lines: [{ sku: 'FRS-MNG-1KG', qty: 2 }] },
    { seq: 9826, customerName: 'Simran Kaur', paymentMethod: 'CARD' as const, status: 'REFUNDED' as const, createdAt: '2026-08-15T12:10:00+05:30', lines: [{ sku: 'COC-ZR-300', qty: 10 }] },
    { seq: 9827, customerName: 'Devansh Rao', paymentMethod: 'UPI' as const, status: 'PAID' as const, createdAt: '2026-08-14T20:33:00+05:30', lines: [{ sku: 'AML-GLD-1L', qty: 3 }, { sku: 'AML-CHZ-200', qty: 2 }] },
    { seq: 9828, customerName: 'Walk-in Customer', paymentMethod: 'CASH' as const, status: 'PAID' as const, createdAt: '2026-08-14T18:15:00+05:30', lines: [{ sku: 'BRT-GDC-200', qty: 5 }] },
    { seq: 9829, customerName: 'Ananya Bose', paymentMethod: 'CARD' as const, status: 'PAID' as const, createdAt: '2026-08-14T14:02:00+05:30', lines: [{ sku: 'CDB-DMS-60', qty: 6 }, { sku: 'NSC-CLC-100', qty: 1 }] },
    { seq: 9830, customerName: 'Kabir Singh', paymentMethod: 'UPI' as const, status: 'PAID' as const, createdAt: '2026-08-14T11:47:00+05:30', lines: [{ sku: 'COC-750-BTL', qty: 12 }] },
    { seq: 9831, customerName: 'Walk-in Customer', paymentMethod: 'CASH' as const, status: 'REFUNDED' as const, createdAt: '2026-08-13T19:58:00+05:30', lines: [{ sku: 'HLD-ALB-200', qty: 2 }, { sku: 'FRS-MNG-1KG', qty: 1 }] },
    { seq: 9832, customerName: 'Neha Kulkarni', paymentMethod: 'UPI' as const, status: 'PAID' as const, createdAt: '2026-08-13T10:24:00+05:30', lines: [{ sku: 'AML-PNR-200', qty: 3 }, { sku: 'BRT-BRB-400', qty: 2 }] },
  ];

  for (const inv of invoiceDefs) {
    const invoiceNumber = `INV-${inv.seq}`;
    const existing = await prisma.invoice.findFirst({ where: { storeId: store.id, invoiceNumber } });
    if (existing) continue;

    const items = buildInvoiceItems(inv.lines);
    const subtotal = items.reduce((sum, i) => sum + i.lineSubtotal, 0);
    const taxTotal = items.reduce((sum, i) => sum + i.lineTax, 0);
    const total = subtotal + taxTotal;

    await prisma.invoice.create({
      data: {
        storeId: store.id,
        customerId: customerIdByName[inv.customerName] ?? null,
        customerName: inv.customerName,
        invoiceNumber,
        status: inv.status,
        paymentMethod: inv.paymentMethod,
        subtotal,
        taxTotal,
        total,
        createdAt: new Date(inv.createdAt),
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            gstRate: i.gstRate,
            total: i.total,
          })),
        },
      },
    });
  }

  const supplierDefs = [
    { key: 'amul', name: 'Amul Dairy Cooperative Ltd', contactPerson: 'Rajesh Sharma', phone: '+91 98201 12345', email: 'supply@amuldairy.com', gstin: '24AAACA1234F1Z9' },
    { key: 'britannia', name: 'Britannia Industries Ltd', contactPerson: 'Sanjay Verma', phone: '+91 98450 99887', email: 'procurement@britannia.co.in', gstin: '29AAACB9876D1Z1' },
    { key: 'nestle', name: 'Nestle India Distribution', contactPerson: 'Anita Desai', phone: '+91 98110 54321', email: 'orders@nestle.co.in', gstin: '07AAACN4321E1Z5' },
    { key: 'mondelez', name: 'Mondelez India Foods Pvt Ltd', contactPerson: 'Karan Mehta', phone: '+91 98200 33210', email: 'trade@mondelezindia.com', gstin: '27AAACM5566K1Z8' },
    { key: 'cocacola', name: 'Hindustan Coca-Cola Beverages', contactPerson: 'Deepak Nair', phone: '+91 98330 77654', email: 'distribution@hccb.in', gstin: '33AAACH7890L1Z3' },
    { key: 'haldirams', name: "Haldiram's Snacks Foods Pvt Ltd", contactPerson: 'Pooja Agarwal', phone: '+91 98110 22456', email: 'supply@haldirams.com', gstin: '09AAACH3456M1Z6' },
  ];

  const supplierIdByKey: Record<string, string> = {};
  for (const s of supplierDefs) {
    const existing = await prisma.supplier.findFirst({ where: { tenantId: tenant.id, name: s.name } });
    const supplier =
      existing ??
      (await prisma.supplier.create({
        data: { tenantId: tenant.id, name: s.name, contactPerson: s.contactPerson, phone: s.phone, email: s.email, gstin: s.gstin },
      }));
    supplierIdByKey[s.key] = supplier.id;
  }

  const poDefs = [
    { seq: 8041, supplierKey: 'amul', paymentStatus: 'PAID' as const, orderStatus: 'RECEIVED' as const, expectedDeliveryDate: '2026-08-05', createdAt: '2026-07-30T10:15:00+05:30', lines: [{ sku: 'AML-GLD-1L', qty: 200 }, { sku: 'AML-PNR-200', qty: 100 }] },
    { seq: 8042, supplierKey: 'britannia', paymentStatus: 'PARTIAL' as const, orderStatus: 'PENDING' as const, expectedDeliveryDate: '2026-08-10', createdAt: '2026-08-02T09:40:00+05:30', lines: [{ sku: 'BRT-GDC-200', qty: 300 }, { sku: 'BRT-BRB-400', qty: 150 }] },
    { seq: 8043, supplierKey: 'nestle', paymentStatus: 'PAID' as const, orderStatus: 'RECEIVED' as const, expectedDeliveryDate: '2026-08-01', createdAt: '2026-07-28T14:05:00+05:30', lines: [{ sku: 'NSC-CLC-100', qty: 120 }, { sku: 'NSC-MNC-4PK', qty: 200 }] },
    { seq: 8044, supplierKey: 'mondelez', paymentStatus: 'UNPAID' as const, orderStatus: 'PENDING' as const, expectedDeliveryDate: '2026-08-12', createdAt: '2026-08-05T11:22:00+05:30', lines: [{ sku: 'CDB-DMS-60', qty: 400 }] },
    { seq: 8045, supplierKey: 'cocacola', paymentStatus: 'PAID' as const, orderStatus: 'RECEIVED' as const, expectedDeliveryDate: '2026-08-03', createdAt: '2026-07-29T08:50:00+05:30', lines: [{ sku: 'COC-750-BTL', qty: 600 }, { sku: 'COC-ZR-300', qty: 250 }] },
    { seq: 8046, supplierKey: 'haldirams', paymentStatus: 'PARTIAL' as const, orderStatus: 'PENDING' as const, expectedDeliveryDate: '2026-08-14', createdAt: '2026-08-07T16:12:00+05:30', lines: [{ sku: 'HLD-ALB-200', qty: 180 }, { sku: 'FRS-MNG-1KG', qty: 80 }] },
    { seq: 8047, supplierKey: 'amul', paymentStatus: 'PAID' as const, orderStatus: 'RECEIVED' as const, expectedDeliveryDate: '2026-07-31', createdAt: '2026-07-25T09:00:00+05:30', lines: [{ sku: 'AML-CHZ-200', qty: 150 }] },
    { seq: 8048, supplierKey: 'britannia', paymentStatus: 'UNPAID' as const, orderStatus: 'PENDING' as const, expectedDeliveryDate: '2026-08-16', createdAt: '2026-08-10T13:35:00+05:30', lines: [{ sku: 'BRT-GDC-200', qty: 220 }, { sku: 'BRT-BRB-400', qty: 100 }] },
  ];

  for (const po of poDefs) {
    const poNumber = `PO-${po.seq}`;
    const existing = await prisma.purchaseOrder.findFirst({ where: { tenantId: tenant.id, poNumber } });
    if (existing) continue;

    const lineItems = po.lines.map(({ sku, qty }) => {
      const product = products.find((p) => p.sku === sku)!;
      return { productId: productIdBySku[sku], qty, unitPrice: product.costPrice };
    });
    const totalAmount = lineItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

    await prisma.purchaseOrder.create({
      data: {
        tenantId: tenant.id,
        supplierId: supplierIdByKey[po.supplierKey],
        poNumber,
        totalAmount,
        expectedDeliveryDate: new Date(po.expectedDeliveryDate),
        paymentStatus: po.paymentStatus,
        orderStatus: po.orderStatus,
        createdAt: new Date(po.createdAt),
        items: { create: lineItems.map((i) => ({ productId: i.productId, qty: i.qty, unitPrice: i.unitPrice })) },
      },
    });
  }

  const warehouseDefs = [
    { key: 'central-mumbai', name: 'Central Distribution Warehouse', code: 'WH-CENTRAL-01', totalRacks: 24, address: 'Plot 14, Industrial Zone 4, Bhiwandi, Mumbai 421302', manager: 'David Miller' },
    { key: 'cold-pune', name: 'Cold Storage Hub', code: 'WH-COLD-02', totalRacks: 16, address: 'Cold Chain Logistics Park, Chakan, Pune 410501', manager: 'Pooja Nair' },
    { key: 'gourmet-thane', name: 'Gourmet & Specialty Vault', code: 'WH-GOURMET-03', totalRacks: 8, address: 'Specialty Foods Depot, Wagle Estate, Thane 400604', manager: 'Vikram Roy' },
    { key: 'north-delhi', name: 'North Regional Hub', code: 'WH-NORTH-04', totalRacks: 20, address: 'Sector 18, Logistics Park, Gurugram, Haryana 122015', manager: 'Simran Kaur' },
  ];

  const warehouseIdByKey: Record<string, string> = {};
  for (const w of warehouseDefs) {
    const existing = await prisma.warehouse.findFirst({ where: { tenantId: tenant.id, name: w.name } });
    const warehouse =
      existing ??
      (await prisma.warehouse.create({
        data: { tenantId: tenant.id, name: w.name, code: w.code, totalRacks: w.totalRacks, address: w.address, manager: w.manager },
      }));
    warehouseIdByKey[w.key] = warehouse.id;
  }

  const transferDefs = [
    { seq: 6011, source: 'central-mumbai', dest: 'cold-pune', carrier: 'Apex Fleet Truck #4 (Driver Manoj Kumar)', status: 'COMPLETED' as const, createdAt: '2026-08-10T16:30:00+05:30', lines: [{ sku: 'AML-GLD-1L', qty: 150 }, { sku: 'AML-PNR-200', qty: 80 }] },
    { seq: 6012, source: 'cold-pune', dest: 'gourmet-thane', carrier: 'Refrigerated Logistics Unit #2', status: 'IN_TRANSIT' as const, createdAt: '2026-08-14T09:15:00+05:30', lines: [{ sku: 'CDB-DMS-60', qty: 200 }] },
    { seq: 6013, source: 'central-mumbai', dest: 'north-delhi', carrier: 'Apex Fleet Truck #1', status: 'COMPLETED' as const, createdAt: '2026-08-08T11:45:00+05:30', lines: [{ sku: 'COC-750-BTL', qty: 400 }, { sku: 'COC-ZR-300', qty: 150 }] },
    { seq: 6014, source: 'gourmet-thane', dest: 'central-mumbai', carrier: 'Secured Transit Logistics', status: 'IN_TRANSIT' as const, createdAt: '2026-08-15T08:50:00+05:30', lines: [{ sku: 'HLD-ALB-200', qty: 120 }, { sku: 'FRS-MNG-1KG', qty: 60 }] },
    { seq: 6015, source: 'north-delhi', dest: 'cold-pune', carrier: 'Cargo Express Van #3', status: 'COMPLETED' as const, createdAt: '2026-08-07T14:20:00+05:30', lines: [{ sku: 'AML-CHZ-200', qty: 100 }] },
    { seq: 6016, source: 'central-mumbai', dest: 'gourmet-thane', carrier: 'Apex Fleet Truck #2', status: 'COMPLETED' as const, createdAt: '2026-08-05T10:00:00+05:30', lines: [{ sku: 'NSC-MNC-4PK', qty: 250 }, { sku: 'NSC-CLC-100', qty: 90 }] },
    { seq: 6017, source: 'cold-pune', dest: 'north-delhi', carrier: 'Northbound Freight Carrier', status: 'IN_TRANSIT' as const, createdAt: '2026-08-16T07:40:00+05:30', lines: [{ sku: 'BRT-GDC-200', qty: 300 }, { sku: 'BRT-BRB-400', qty: 150 }] },
    { seq: 6018, source: 'north-delhi', dest: 'central-mumbai', carrier: 'Apex Fleet Truck #3', status: 'COMPLETED' as const, createdAt: '2026-08-06T13:10:00+05:30', lines: [{ sku: 'AML-GLD-1L', qty: 180 }] },
  ];

  for (const t of transferDefs) {
    const transferNumber = `TRF-${t.seq}`;
    const existing = await prisma.warehouseTransfer.findFirst({ where: { tenantId: tenant.id, transferNumber } });
    if (existing) continue;

    const lineItems = t.lines.map(({ sku, qty }) => {
      const product = products.find((p) => p.sku === sku)!;
      return { productId: productIdBySku[sku], qty, costPrice: product.costPrice };
    });
    const totalValuation = lineItems.reduce((sum, i) => sum + i.qty * i.costPrice, 0);

    await prisma.warehouseTransfer.create({
      data: {
        tenantId: tenant.id,
        transferNumber,
        sourceWarehouseId: warehouseIdByKey[t.source],
        destinationWarehouseId: warehouseIdByKey[t.dest],
        totalValuation,
        carrier: t.carrier,
        status: t.status,
        createdAt: new Date(t.createdAt),
        items: { create: lineItems.map((i) => ({ productId: i.productId, qty: i.qty })) },
      },
    });
  }

  const gstReturnDefs = [
    { formType: 'GSTR1' as const, periodMonth: '2026-08-01', billedTurnover: 148920, taxLiability: 17870.4, arn: null, status: 'PENDING' as const },
    { formType: 'GSTR3B' as const, periodMonth: '2026-07-01', billedTurnover: 215400, taxLiability: 25848, arn: 'AA270726098712', status: 'FILED' as const },
    { formType: 'GSTR1' as const, periodMonth: '2026-06-01', billedTurnover: 198600, taxLiability: 23832, arn: 'AA270626084123', status: 'FILED' as const },
    { formType: 'GSTR3B' as const, periodMonth: '2026-05-01', billedTurnover: 182500, taxLiability: 21900, arn: 'AA270526071490', status: 'FILED' as const },
    { formType: 'GSTR1' as const, periodMonth: '2026-04-01', billedTurnover: 245000, taxLiability: 29400, arn: 'AA270426061234', status: 'FILED' as const },
    { formType: 'GSTR3B' as const, periodMonth: '2026-03-01', billedTurnover: 160000, taxLiability: 19200, arn: 'AA270326051982', status: 'FILED' as const },
    { formType: 'GSTR1' as const, periodMonth: '2026-02-01', billedTurnover: 172400, taxLiability: 20688, arn: 'AA270226043765', status: 'FILED' as const },
    { formType: 'GSTR3B' as const, periodMonth: '2026-01-01', billedTurnover: 158900, taxLiability: 19068, arn: 'AA270126039981', status: 'FILED' as const },
  ];

  for (const g of gstReturnDefs) {
    const existing = await prisma.gstReturn.findFirst({ where: { tenantId: tenant.id, formType: g.formType, periodMonth: new Date(g.periodMonth) } });
    if (!existing) {
      await prisma.gstReturn.create({
        data: {
          tenantId: tenant.id,
          formType: g.formType,
          periodMonth: new Date(g.periodMonth),
          billedTurnover: g.billedTurnover,
          taxLiability: g.taxLiability,
          arn: g.arn,
          status: g.status,
        },
      });
    }
  }

  console.log(
    `Seeded tenant "${tenant.name}" with ${categoryDefs.length} categories, ${brandDefs.length} brands, ${products.length} products, ${adjustmentDefs.length} stock adjustments, 1 store, ${customerDefs.length} customers, ${invoiceDefs.length} invoices, ${supplierDefs.length} suppliers, ${poDefs.length} purchase orders, ${warehouseDefs.length} warehouses, ${transferDefs.length} warehouse transfers, and ${gstReturnDefs.length} GST returns.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
