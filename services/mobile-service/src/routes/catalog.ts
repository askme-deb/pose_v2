import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { requirePermission, HttpError, tenantIdOf } from '@pospe/permissions';
import { prisma, ctxOf } from '../lib/prisma';
import { productInclude, productJson } from '../lib/orderView';
import { addToCart } from './cart';

const router = Router();

const searchWhere = (tenantId: string, search?: unknown): Prisma.ProductWhereInput => {
  const q = typeof search === 'string' ? search.trim() : '';
  return {
    tenantId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { barcode: { equals: q } },
            { options: { some: { OR: [{ sku: { contains: q, mode: 'insensitive' } }, { barcode: { equals: q } }] } } },
          ],
        }
      : {}),
  };
};

router.get('/get-categories', async (req, res) => {
  const tenantId = tenantIdOf(req);
  const categories = await prisma.category.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  res.json({ data: categories.map((c) => ({ id: c.id, name: c.name })) });
});

router.get('/get-category-wise-all-product', async (req, res) => {
  const tenantId = tenantIdOf(req);
  const products = await prisma.product.findMany({ where: searchWhere(tenantId, req.query.search), orderBy: { name: 'asc' }, take: 1000, include: productInclude });
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
    include: productInclude,
  });
  res.json({ products: products.map(productJson) });
});

// A barcode scan adds the item to the server-side cart itself; the app only
// reloads cart-items afterwards (contract §4.5).
router.post('/get-products-by-barcode', requirePermission('billing:create'), async (req, res) => {
  const barcode = String((req.body as { barcode?: unknown })?.barcode ?? '').trim();
  if (!barcode) throw new HttpError(400, 'Barcode is required');
  const ctx = await ctxOf(req);
  // A variation option can carry its own barcode; try those first.
  const option = await prisma.productOption.findFirst({ where: { tenantId: ctx.tenantId, barcode }, include: { product: true } });
  const product = option?.product ?? (await prisma.product.findFirst({ where: { tenantId: ctx.tenantId, barcode } }));
  if (!product) return res.status(404).json({ status: false, message: 'No product found for this barcode' });
  await addToCart(ctx, product.id, option?.id, 1);
  res.json({ status: true, message: `${product.name}${option ? ` (${option.name})` : ''} added to cart` });
});

router.get('/search-products', async (req, res) => {
  const tenantId = tenantIdOf(req);
  const q = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (!q) return res.json({ data: [] });
  const products = await prisma.product.findMany({ where: searchWhere(tenantId, q), orderBy: { name: 'asc' }, take: 30, include: { options: { orderBy: { position: 'asc' } } } });
  const row = (p: (typeof products)[number], o?: (typeof products)[number]['options'][number]) => {
    const unit = o ? (Number(o.mrp) > 0 ? Number(o.mrp) : Number(o.price)) : Number(p.mrp) > 0 ? Number(p.mrp) : Number(p.price);
    const half = Math.round(((unit * Number(p.gstRate)) / 200 + Number.EPSILON) * 100) / 100;
    return {
      product_id: p.id,
      variation_option_id: o?.id ?? p.id,
      product_name: o ? `${p.name} (${o.name})` : p.name,
      product_image: p.imageUrl ?? '',
      product_price: unit,
      stock: o ? o.stockQty : p.stockQty,
      is_gst_included: false,
      sgst_amount: half,
      cgst_amount: half,
    };
  };
  // A product with variations is stocked in per option, so each option is its own row.
  res.json({ data: products.flatMap((p) => (p.options.length ? p.options.map((o) => row(p, o)) : [row(p)])) });
});

export default router;
