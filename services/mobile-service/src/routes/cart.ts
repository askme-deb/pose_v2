import { Router } from 'express';
import { z } from 'zod';
import { requirePermission, HttpError } from '@pospe/permissions';
import { prisma, ctxOf, type MobileCtx } from '../lib/prisma';
import { buildView, cartLines, heldInclude, orderLines, recomputeHeld } from '../lib/orderView';
import { toNum, num } from '../lib/util';

const router = Router();
const canBill = requirePermission('billing:create');

/** Stock is only enforced for branches with purchasing on (contract §3.4); checkout still guards oversell. */
async function assertStock(ctx: MobileCtx, product: { name: string; stockQty: number; isBundle: boolean }, wanted: number) {
  if (product.isBundle) return;
  const store = await prisma.store.findUniqueOrThrow({ where: { id: ctx.storeId }, select: { purchaseEnabled: true } });
  if (store.purchaseEnabled && wanted > product.stockQty) {
    throw new HttpError(400, `Only ${product.stockQty} of ${product.name} in stock`);
  }
}

export async function addToCart(ctx: MobileCtx, productId: string, qty: number) {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId: ctx.tenantId } });
  if (!product) throw new HttpError(404, 'Product not found');
  const existing = await prisma.mobileCartLine.findUnique({
    where: { userId_storeId_productId: { userId: ctx.userId, storeId: ctx.storeId, productId } },
  });
  await assertStock(ctx, product, (existing?.quantity ?? 0) + qty);
  await prisma.mobileCartLine.upsert({
    where: { userId_storeId_productId: { userId: ctx.userId, storeId: ctx.storeId, productId } },
    create: { tenantId: ctx.tenantId, userId: ctx.userId, storeId: ctx.storeId, productId, quantity: qty },
    update: { quantity: { increment: qty } },
  });
}

async function heldOrder(ctx: MobileCtx, orderId: unknown) {
  const id = String(orderId ?? '');
  if (!id) throw new HttpError(400, 'order_id is required');
  const order = await prisma.invoice.findFirst({
    where: { id, storeId: ctx.storeId, status: 'HELD', store: { tenantId: ctx.tenantId } },
    include: heldInclude,
  });
  if (!order) throw new HttpError(404, 'Held order not found');
  return order;
}

const addInput = z.object({
  product_id: z.union([z.string(), z.number()]).transform(String),
  items: z.array(z.object({ quantity: z.union([z.number(), z.string()]).transform(Number) })).min(1),
  order_id: z.union([z.string(), z.number()]).optional(),
});

async function addHandler(req: import('express').Request, res: import('express').Response, orderMode: boolean) {
  const body = addInput.parse(req.body);
  const ctx = await ctxOf(req);
  const qty = body.items.reduce((s, i) => s + (Number.isFinite(i.quantity) ? i.quantity : 0), 0);
  if (!(qty > 0)) throw new HttpError(400, 'Quantity must be at least 1');

  if (!orderMode) {
    await addToCart(ctx, body.product_id, qty);
    return res.json({ status: true });
  }
  const order = await heldOrder(ctx, body.order_id);
  const product = await prisma.product.findFirst({ where: { id: body.product_id, tenantId: ctx.tenantId } });
  if (!product) throw new HttpError(404, 'Product not found');
  const existing = order.items.find((i) => i.productId === product.id);
  await assertStock(ctx, product, (existing?.quantity ?? 0) + qty);
  await prisma.$transaction(async (tx) => {
    if (existing) await tx.invoiceItem.update({ where: { id: existing.id }, data: { quantity: { increment: qty } } });
    else await tx.invoiceItem.create({ data: { invoiceId: order.id, productId: product.id, quantity: qty, price: product.price, gstRate: product.gstRate, total: 0 } });
    await recomputeHeld(tx, order.id);
  });
  res.json({ status: true });
}

router.post('/add-to-cart', canBill, (req, res) => addHandler(req, res, false));
router.post('/update-order', canBill, (req, res) => addHandler(req, res, true));

const viewQuery = (req: import('express').Request) => ({
  bill: toNum(req.query.discount, NaN),
  comp: toNum(req.query.complementary, NaN),
  gstSame: req.query.is_gst_same === undefined ? undefined : String(req.query.is_gst_same) !== 'false' && String(req.query.is_gst_same) !== '0',
});

router.get('/cart-items', async (req, res) => {
  const ctx = await ctxOf(req);
  const { bill, comp, gstSame } = viewQuery(req);
  res.json(buildView(await cartLines(ctx.userId, ctx.storeId), Number.isNaN(bill) ? 0 : bill, Number.isNaN(comp) ? 0 : comp, gstSame ?? true));
});

router.get('/order-items', async (req, res) => {
  const ctx = await ctxOf(req);
  const order = await heldOrder(ctx, req.query.order_id);
  const { bill, comp, gstSame } = viewQuery(req);
  res.json(
    buildView(
      orderLines(order.items),
      Number.isNaN(bill) ? num(order.billDiscountAmount) : bill,
      Number.isNaN(comp) ? num(order.complimentaryAmount) : comp,
      gstSame ?? order.isGstSame,
    ),
  );
});

const qtyInput = z.object({
  product_id: z.union([z.string(), z.number()]).transform(String),
  type: z.enum(['increment', 'decrement']),
  quantity: z.union([z.number(), z.string()]).transform(Number).optional(),
  order_id: z.union([z.string(), z.number()]).optional(),
});

async function quantityHandler(req: import('express').Request, res: import('express').Response, orderMode: boolean) {
  const body = qtyInput.parse(req.body);
  const ctx = await ctxOf(req);
  const step = body.quantity && body.quantity > 0 ? Math.floor(body.quantity) : 1;
  const delta = body.type === 'increment' ? step : -step;

  if (!orderMode) {
    const key = { userId_storeId_productId: { userId: ctx.userId, storeId: ctx.storeId, productId: body.product_id } };
    const line = await prisma.mobileCartLine.findUnique({ where: key, include: { product: true } });
    if (!line) throw new HttpError(404, 'Item not in cart');
    const next = line.quantity + delta;
    if (next <= 0) await prisma.mobileCartLine.delete({ where: key });
    else {
      if (delta > 0) await assertStock(ctx, line.product, next);
      await prisma.mobileCartLine.update({ where: key, data: { quantity: next } });
    }
    return res.json({ status: true });
  }

  const order = await heldOrder(ctx, body.order_id);
  const item = order.items.find((i) => i.productId === body.product_id);
  if (!item) throw new HttpError(404, 'Item not in order');
  const next = item.quantity + delta;
  if (delta > 0) await assertStock(ctx, item.product, next);
  await prisma.$transaction(async (tx) => {
    if (next <= 0) await tx.invoiceItem.delete({ where: { id: item.id } });
    else await tx.invoiceItem.update({ where: { id: item.id }, data: { quantity: next } });
    await recomputeHeld(tx, order.id);
  });
  res.json({ status: true });
}

router.post('/update-cart-quantity', canBill, (req, res) => quantityHandler(req, res, false));
router.post('/order-quantity-update', canBill, (req, res) => quantityHandler(req, res, true));

const deleteInput = z.object({
  product_id: z.union([z.string(), z.number()]).transform(String),
  order_id: z.union([z.string(), z.number()]).optional(),
});

router.post('/delete-cart-item', canBill, async (req, res) => {
  const body = deleteInput.parse(req.body);
  const ctx = await ctxOf(req);
  await prisma.mobileCartLine.deleteMany({ where: { userId: ctx.userId, storeId: ctx.storeId, productId: body.product_id } });
  res.json({ status: true });
});

router.post('/order-item-delete', canBill, async (req, res) => {
  const body = deleteInput.parse(req.body);
  const ctx = await ctxOf(req);
  const order = await heldOrder(ctx, body.order_id);
  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: order.id, productId: body.product_id } });
    await recomputeHeld(tx, order.id);
  });
  res.json({ status: true });
});

// Item discounts carry no vendorId in the contract, so the branch comes from
// the user's locked/assigned store; the line id itself is already unique.
const discountInput = z.object({
  cart_id: z.union([z.string(), z.number()]).transform(String).optional(),
  order_items_id: z.union([z.string(), z.number()]).transform(String).optional(),
  discount_amount: z.union([z.number(), z.string()]).transform((v) => Math.max(0, Number(v) || 0)),
});

router.post('/add-cart-item-discount', canBill, async (req, res) => {
  const body = discountInput.parse(req.body);
  const ctx = await ctxOf(req);
  const line = await prisma.mobileCartLine.findFirst({ where: { id: body.cart_id ?? '', userId: ctx.userId, storeId: ctx.storeId }, include: { product: true } });
  if (!line) throw new HttpError(404, 'Cart item not found');
  const gross = num(line.product.price) * line.quantity;
  if (body.discount_amount > gross) throw new HttpError(400, 'Discount cannot exceed the item total');
  await prisma.mobileCartLine.update({ where: { id: line.id }, data: { discountAmount: body.discount_amount } });
  res.json({ status: true });
});

router.post('/add-order-item-discount', canBill, async (req, res) => {
  const body = discountInput.parse(req.body);
  const ctx = await ctxOf(req);
  const item = await prisma.invoiceItem.findFirst({
    where: { id: body.order_items_id ?? '', invoice: { storeId: ctx.storeId, status: 'HELD', store: { tenantId: ctx.tenantId } } },
  });
  if (!item) throw new HttpError(404, 'Order item not found');
  if (body.discount_amount > num(item.price) * item.quantity) throw new HttpError(400, 'Discount cannot exceed the item total');
  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.update({ where: { id: item.id }, data: { discountAmount: body.discount_amount } });
    await recomputeHeld(tx, item.invoiceId);
  });
  res.json({ status: true });
});

export default router;
