import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { Product, ProductOption } from '@prisma/client';
import { requirePermission, HttpError } from '@pospe/permissions';
import { prisma, ctxOf, type MobileCtx } from '../lib/prisma';
import { buildView, cartLines, heldInclude, orderLines, recomputeHeld } from '../lib/orderView';
import { toNum, num } from '../lib/util';

const router = Router();
const canBill = requirePermission('billing:create');

const idish = z.union([z.string(), z.number()]).transform(String);

/** The app sends the product id as option_id for products without variations; that means "no option". */
const normOption = (productId: string, optionId: unknown): string => {
  const id = optionId == null ? '' : String(optionId);
  return id === productId ? '' : id;
};

export interface Sellable {
  product: Product & { options: ProductOption[] };
  option: ProductOption | null;
}

/** Resolves what is being sold: a plain product, or one option of a product with variations. */
export async function resolveSellable(tenantId: string, productId: string, optionId?: unknown): Promise<Sellable> {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId }, include: { options: { orderBy: { position: 'asc' } } } });
  if (!product) throw new HttpError(404, 'Product not found');
  const wanted = normOption(productId, optionId);
  if (!product.options.length) return { product, option: null };
  const option = product.options.find((o) => o.id === wanted);
  if (!option) throw new HttpError(400, `Choose a ${(product.variationName ?? 'variation').toLowerCase()} for ${product.name}`);
  return { product, option };
}

/** Stock is only enforced for branches with purchasing on (contract §3.4); checkout still guards oversell. */
async function assertStock(ctx: MobileCtx, s: Sellable, wanted: number) {
  if (s.product.isBundle) return;
  const store = await prisma.store.findUniqueOrThrow({ where: { id: ctx.storeId }, select: { purchaseEnabled: true } });
  const available = s.option ? s.option.stockQty : s.product.stockQty;
  if (store.purchaseEnabled && wanted > available) {
    throw new HttpError(400, `Only ${available} of ${s.product.name}${s.option ? ` (${s.option.name})` : ''} in stock`);
  }
}

export async function addToCart(ctx: MobileCtx, productId: string, optionId: unknown, qty: number) {
  const s = await resolveSellable(ctx.tenantId, productId, optionId);
  const optionKey = s.option?.id ?? '';
  const where = { userId_storeId_productId_optionKey: { userId: ctx.userId, storeId: ctx.storeId, productId, optionKey } };
  const existing = await prisma.mobileCartLine.findUnique({ where });
  await assertStock(ctx, s, (existing?.quantity ?? 0) + qty);
  await prisma.mobileCartLine.upsert({
    where,
    create: { tenantId: ctx.tenantId, userId: ctx.userId, storeId: ctx.storeId, productId, optionId: s.option?.id ?? null, optionKey, quantity: qty },
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
  product_id: idish,
  items: z.array(z.object({ option_id: idish.optional(), quantity: z.union([z.number(), z.string()]).transform(Number) })).min(1),
  order_id: idish.optional(),
});

async function addHandler(req: Request, res: Response, orderMode: boolean) {
  const body = addInput.parse(req.body);
  const ctx = await ctxOf(req);
  if (body.items.some((i) => !Number.isFinite(i.quantity) || i.quantity <= 0)) throw new HttpError(400, 'Quantity must be at least 1');

  if (!orderMode) {
    for (const item of body.items) await addToCart(ctx, body.product_id, item.option_id, item.quantity);
    return res.json({ status: true });
  }

  const order = await heldOrder(ctx, body.order_id);
  for (const item of body.items) {
    const s = await resolveSellable(ctx.tenantId, body.product_id, item.option_id);
    const existing = order.items.find((i) => i.productId === s.product.id && (i.optionId ?? '') === (s.option?.id ?? ''));
    await assertStock(ctx, s, (existing?.quantity ?? 0) + item.quantity);
    await prisma.$transaction(async (tx) => {
      if (existing) await tx.invoiceItem.update({ where: { id: existing.id }, data: { quantity: { increment: item.quantity } } });
      else {
        await tx.invoiceItem.create({
          data: {
            invoiceId: order.id,
            productId: s.product.id,
            optionId: s.option?.id ?? null,
            optionName: s.option?.name ?? null,
            quantity: item.quantity,
            price: (s.option ?? s.product).price,
            gstRate: s.product.gstRate,
            total: 0,
          },
        });
      }
      await recomputeHeld(tx, order.id);
    });
    // Later items in this call must see the lines written by the earlier ones.
    order.items = (await heldOrder(ctx, order.id)).items;
  }
  res.json({ status: true });
}

router.post('/add-to-cart', canBill, (req, res) => addHandler(req, res, false));
router.post('/update-order', canBill, (req, res) => addHandler(req, res, true));

const viewQuery = (req: Request) => ({
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
      await orderLines(order.items),
      Number.isNaN(bill) ? num(order.billDiscountAmount) : bill,
      Number.isNaN(comp) ? num(order.complimentaryAmount) : comp,
      gstSame ?? order.isGstSame,
    ),
  );
});

const qtyInput = z.object({
  product_id: idish,
  option_id: idish.optional(),
  type: z.enum(['increment', 'decrement']),
  quantity: z.union([z.number(), z.string()]).transform(Number).optional(),
  order_id: idish.optional(),
});

/** Picks the cart line / order item for a product (+ option), or the only one the product has when option_id is absent. */
function pick<T extends { productId: string }>(rows: T[], productId: string, optionId: unknown, optionOf: (r: T) => string): T | undefined {
  const same = rows.filter((r) => r.productId === productId);
  const wanted = normOption(productId, optionId);
  const exact = same.find((r) => optionOf(r) === wanted);
  if (exact) return exact;
  if (optionId == null && same.length === 1) return same[0];
  return undefined;
}

async function quantityHandler(req: Request, res: Response, orderMode: boolean) {
  const body = qtyInput.parse(req.body);
  const ctx = await ctxOf(req);
  const step = body.quantity && body.quantity > 0 ? Math.floor(body.quantity) : 1;
  const delta = body.type === 'increment' ? step : -step;

  if (!orderMode) {
    const rows = await prisma.mobileCartLine.findMany({ where: { userId: ctx.userId, storeId: ctx.storeId, productId: body.product_id } });
    const line = pick(rows, body.product_id, body.option_id, (r) => r.optionKey);
    if (!line) throw new HttpError(404, 'Item not in cart');
    const next = line.quantity + delta;
    if (next <= 0) await prisma.mobileCartLine.delete({ where: { id: line.id } });
    else {
      if (delta > 0) await assertStock(ctx, await resolveSellable(ctx.tenantId, line.productId, line.optionId), next);
      await prisma.mobileCartLine.update({ where: { id: line.id }, data: { quantity: next } });
    }
    return res.json({ status: true });
  }

  const order = await heldOrder(ctx, body.order_id);
  const item = pick(order.items, body.product_id, body.option_id, (r) => r.optionId ?? '');
  if (!item) throw new HttpError(404, 'Item not in order');
  const next = item.quantity + delta;
  if (delta > 0) await assertStock(ctx, await resolveSellable(ctx.tenantId, item.productId, item.optionId), next);
  await prisma.$transaction(async (tx) => {
    if (next <= 0) await tx.invoiceItem.delete({ where: { id: item.id } });
    else await tx.invoiceItem.update({ where: { id: item.id }, data: { quantity: next } });
    await recomputeHeld(tx, order.id);
  });
  res.json({ status: true });
}

router.post('/update-cart-quantity', canBill, (req, res) => quantityHandler(req, res, false));
router.post('/order-quantity-update', canBill, (req, res) => quantityHandler(req, res, true));

const deleteInput = z.object({ product_id: idish, option_id: idish.optional(), order_id: idish.optional() });

router.post('/delete-cart-item', canBill, async (req, res) => {
  const body = deleteInput.parse(req.body);
  const ctx = await ctxOf(req);
  const rows = await prisma.mobileCartLine.findMany({ where: { userId: ctx.userId, storeId: ctx.storeId, productId: body.product_id } });
  // Without an option, remove every line of the product.
  const targets = body.option_id == null ? rows : rows.filter((r) => r.optionKey === normOption(body.product_id, body.option_id));
  await prisma.mobileCartLine.deleteMany({ where: { id: { in: targets.map((r) => r.id) } } });
  res.json({ status: true });
});

router.post('/order-item-delete', canBill, async (req, res) => {
  const body = deleteInput.parse(req.body);
  const ctx = await ctxOf(req);
  const order = await heldOrder(ctx, body.order_id);
  const targets = order.items.filter((i) => i.productId === body.product_id && (body.option_id == null || (i.optionId ?? '') === normOption(body.product_id, body.option_id)));
  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { id: { in: targets.map((i) => i.id) } } });
    await recomputeHeld(tx, order.id);
  });
  res.json({ status: true });
});

// Item discounts carry no vendorId in the contract, so the branch comes from
// the user's locked/assigned store; the line id itself is already unique.
const discountInput = z.object({
  cart_id: idish.optional(),
  order_items_id: idish.optional(),
  discount_amount: z.union([z.number(), z.string()]).transform((v) => Math.max(0, Number(v) || 0)),
});

router.post('/add-cart-item-discount', canBill, async (req, res) => {
  const body = discountInput.parse(req.body);
  const ctx = await ctxOf(req);
  const line = (await cartLines(ctx.userId, ctx.storeId)).find((l) => l.id === body.cart_id);
  if (!line) throw new HttpError(404, 'Cart item not found');
  if (body.discount_amount > line.price * line.quantity) throw new HttpError(400, 'Discount cannot exceed the item total');
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
