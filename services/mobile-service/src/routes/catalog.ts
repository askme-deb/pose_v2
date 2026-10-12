import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { requirePermission, HttpError, tenantIdOf } from '@pospe/permissions';
import { prisma, ctxOf } from '../lib/prisma';
import { productJson } from '../lib/orderView';
import { addToCart } from './cart';

const router = Router();

const searchWhere = (tenantId: string, search?: unknown): Prisma.ProductWhereInput => {
  const q = typeof search === 'string' ? search.trim() : '';
  return {
    tenantId,
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }, { barcode: { equals: q } }] } : {}),
  };
};

router.get('/get-categories', async (req, res) => {
  const tenantId = tenantIdOf(req);
  const categories = await prisma.category.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  res.json({ data: categories.map((c) => ({ id: c.id, name: c.name })) });
});

router.get('/get-category-wise-all-product', async (req, res) => {
  const tenantId = tenantIdOf(req);
  const products = await prisma.product.findMany({ where: searchWhere(tenantId, req.query.search), orderBy: { name: 'asc' }, take: 1000 });
  const byCategory = new Map<string, typeof products>();
  for (const p of products) byCategory.set(p.categoryId ?? '', [...(byCategory.get(p.categoryId ?? '') ?? []), p]);
  res.json({ data: [...byCategory.values()].map((list) => ({ products: list.map(productJson) })) });
});

router.get('/get-products-by-category/:id', async (req, res) => {
  const tenantId = tenantIdOf(req);
  // The app's own "All" tab uses id 1; anything that isn't a real category id
  // yields every product, matching what that extra call is for.
  const id = String(req.params.id);
  const category = id === '1' ? null : await prisma.category.findFirst({ where: { id, tenantId }, select: { id: true } });
  const products = await prisma.product.findMany({
    where: { ...searchWhere(tenantId, req.query.search), ...(category ? { categoryId: category.id } : {}) },
    orderBy: { name: 'asc' },
    take: 1000,
  });
  res.json({ products: products.map(productJson) });
});

// A barcode scan adds the item to the server-side cart itself; the app only
// reloads cart-items afterwards (contract §4.5).
router.post('/get-products-by-barcode', requirePermission('billing:create'), async (req, res) => {
  const barcode = String((req.body as { barcode?: unknown })?.barcode ?? '').trim();
  if (!barcode) throw new HttpError(400, 'Barcode is required');
  const ctx = await ctxOf(req);
  const product = await prisma.product.findFirst({ where: { tenantId: ctx.tenantId, barcode } });
  if (!product) return res.status(404).json({ status: false, message: 'No product found for this barcode' });
  await addToCart(ctx, product.id, 1);
  res.json({ status: true, message: `${product.name} added to cart` });
});

router.get('/search-products', async (req, res) => {
  const tenantId = tenantIdOf(req);
  const q = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (!q) return res.json({ data: [] });
  const products = await prisma.product.findMany({ where: searchWhere(tenantId, q), orderBy: { name: 'asc' }, take: 30 });
  res.json({
    data: products.map((p) => {
      const unit = Number(p.mrp) > 0 ? Number(p.mrp) : Number(p.price);
      const gst = Number(p.gstRate);
      const half = Math.round(((unit * gst) / 200 + Number.EPSILON) * 100) / 100;
      return {
        product_id: p.id,
        variation_option_id: p.id,
        product_name: p.name,
        product_image: p.imageUrl ?? '',
        product_price: unit,
        stock: p.stockQty,
        is_gst_included: false,
        sgst_amount: half,
        cgst_amount: half,
      };
    }),
  });
});

export default router;
