import { Router, type Request } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { requirePermission, HttpError } from '@pospe/permissions';
import { prisma, ctxOf, type MobileCtx } from '../lib/prisma';
import { buildView, cartLines, heldInclude, orderLines, recomputeHeld } from '../lib/orderView';
import { dayEnd, dayStart, holdCode, idFromHoldCode, num, round2, titleCaseMethod, toNum } from '../lib/util';

const router = Router();
const canBill = requirePermission('billing:create');
const SALES_SERVICE_URL = () => process.env.SALES_SERVICE_URL || 'http://localhost:4005';

const optNum = z.union([z.number(), z.string()]).transform((v) => Math.max(0, Number(v) || 0)).optional();
const optBool = z.union([z.boolean(), z.string(), z.number()]).transform((v) => v === true || v === 1 || v === '1' || v === 'true').optional();
const idish = z.union([z.string(), z.number()]).transform(String);

// ---------------------------------------------------------------- seats
router.get('/get-branch', async (req, res) => {
  const { storeId } = await ctxOf(req);
  const seats = await prisma.storeSeat.findMany({ where: { storeId }, orderBy: [{ groupName: 'asc' }, { name: 'asc' }] });
  const groups = new Map<string, { id: string; name: string }[]>();
  for (const s of seats) groups.set(s.groupName, [...(groups.get(s.groupName) ?? []), { id: s.id, name: s.name }]);
  res.json({
    data: { branch: [...groups.entries()].map(([name, list], i) => ({ id: i + 1, name, seat_number: list })) },
  });
});

// Back-office hook so a branch can actually have seats: replaces the list.
router.put('/seats', requirePermission('store:manage'), async (req, res) => {
  const body = z.object({ seats: z.array(z.object({ group: z.string().trim().min(1), name: z.string().trim().min(1) })).max(2000) }).parse(req.body);
  const { storeId } = await ctxOf(req);
  await prisma.$transaction([
    prisma.storeSeat.deleteMany({ where: { storeId } }),
    prisma.storeSeat.createMany({ data: [...new Map(body.seats.map((s) => [s.name, s])).values()].map((s) => ({ storeId, groupName: s.group, name: s.name })) }),
  ]);
  res.json({ status: true, count: body.seats.length });
});

// -------------------------------------------------------------- razorpay
const razorpayKeys = () => {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  return id && secret ? { id, secret, auth: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}` } : null;
};

router.post('/create-razorpay-order', canBill, async (req, res) => {
  const { amount } = z.object({ amount: z.union([z.number(), z.string()]).transform(Number).refine((n) => n > 0, 'amount must be positive') }).parse(req.body);
  const keys = razorpayKeys();
  if (!keys) return res.status(503).json({ success: false, message: 'Online payments are not configured' });

  // The amount the customer is asked to pay may never exceed what the cart
  // can possibly cost (discounts only lower it), so a tampered request can't
  // create an order for an arbitrary sum.
  const ctx = await ctxOf(req);
  const lines = await cartLines(ctx.userId, ctx.storeId);
  if (lines.length) {
    const ceiling = buildView(lines, 0, 0, true).rounded_grand_total;
    if (amount > ceiling + 1) throw new HttpError(400, 'Amount is higher than the cart total');
  }

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: keys.auth },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt: `m-${Date.now().toString(36)}` }),
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
  if (!response.ok || !body.id) return res.status(502).json({ success: false, message: body.error?.description ?? 'Could not create the payment order' });
  res.json({ success: true, order_id: body.id });
});

/** Checks the Razorpay signature and that the money really arrived (contract §6.2). */
async function verifyRazorpay(b: { razorpay_order_id?: string; razorpay_signature?: string; gateway_transaction_id?: string }, expectedRupees: number) {
  if (!b.razorpay_signature) return;
  const keys = razorpayKeys();
  if (!keys) throw new HttpError(503, 'Online payments are not configured');
  if (!b.razorpay_order_id || !b.gateway_transaction_id) throw new HttpError(400, 'Incomplete payment details');
  const expected = crypto.createHmac('sha256', keys.secret).update(`${b.razorpay_order_id}|${b.gateway_transaction_id}`).digest('hex');
  const a = Buffer.from(expected);
  const c = Buffer.from(b.razorpay_signature);
  if (a.length !== c.length || !crypto.timingSafeEqual(a, c)) throw new HttpError(400, 'Payment verification failed');

  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(b.gateway_transaction_id)}`, { headers: { Authorization: keys.auth } });
  const payment = (await response.json().catch(() => ({}))) as { status?: string; amount?: number; order_id?: string };
  if (!response.ok) throw new HttpError(502, 'Could not confirm the payment with Razorpay');
  if (payment.order_id !== b.razorpay_order_id) throw new HttpError(400, 'Payment does not belong to this order');
  if (payment.status !== 'captured' && payment.status !== 'authorized') throw new HttpError(400, `Payment is ${payment.status ?? 'not completed'}`);
  if ((payment.amount ?? 0) < Math.round(expectedRupees * 100) - 100) throw new HttpError(400, 'Paid amount is less than the bill total');
}

// -------------------------------------------------------------- checkout
const methodMap: Record<string, 'CASH' | 'UPI' | 'CARD'> = { cash: 'CASH', upi: 'UPI', card: 'CARD' };

const placeInput = z.object({
  payment_method: z.string().transform((v, c) => methodMap[v.toLowerCase()] ?? (c.addIssue({ code: 'custom', message: 'Unsupported payment method' }), z.NEVER)),
  contact_number: z.string().nullable().optional(),
  is_gst_same: optBool,
  seat_number: z.array(z.string()).optional(),
  discount_amount: optNum,
  complimentary_amount: optNum,
  gateway_transaction_id: z.string().optional(),
  razorpay_order_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
  txnId: z.string().optional(),
  cardLastFourDigit: z.string().optional(),
  amountOriginal: z.union([z.number(), z.string()]).optional(),
  paymentMode: z.string().optional(),
  deviceSerial: z.string().optional(),
  deviceType: z.string().optional(),
});

interface CheckoutLine {
  productId: string;
  quantity: number;
  discountAmount: number;
}

async function runCheckout(req: Request, ctx: MobileCtx, lines: CheckoutLine[], b: z.infer<typeof placeInput>, fallbackDiscount: number, fallbackComp: number, key: string) {
  const reference = b.gateway_transaction_id ?? b.txnId;
  const response = await fetch(`${SALES_SERVICE_URL()}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: req.header('authorization') ?? '',
      'x-store-id': ctx.storeId,
      // A retry of the same cart (flaky mobile network) returns the first
      // invoice instead of billing twice.
      'idempotency-key': key,
    },
    body: JSON.stringify({
      paymentMethod: b.payment_method,
      items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, ...(l.discountAmount > 0 ? { discountAmount: l.discountAmount } : {}) })),
      billDiscountAmount: b.discount_amount ?? fallbackDiscount,
      complimentaryAmount: b.complimentary_amount ?? fallbackComp,
      isGstSame: b.is_gst_same ?? true,
      ...(b.contact_number ? { customerPhone: b.contact_number } : {}),
      ...(b.seat_number?.length ? { seatNo: b.seat_number.join(', ') } : {}),
      ...(reference ? { paymentReference: reference } : {}),
      ...(b.txnId ? { posTxnId: b.txnId } : {}),
      ...(b.cardLastFourDigit ? { cardLastFour: b.cardLastFourDigit } : {}),
      ...(b.deviceSerial ? { deviceSerial: b.deviceSerial } : {}),
      ...(b.deviceType ? { deviceType: b.deviceType } : {}),
    }),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: unknown };
  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : 'Could not complete the order';
    throw new HttpError([400, 403, 404, 409].includes(response.status) ? response.status : 502, message);
  }
  return body as unknown as {
    id: string;
    invoiceNumber: string | null;
    createdAt: string;
    total: string | number;
    discountTotal: string | number;
    taxTotal: string | number;
    complimentaryAmount?: string | number;
    isGstSame?: boolean;
  };
}

function receipt(invoice: Awaited<ReturnType<typeof runCheckout>>, b: z.infer<typeof placeInput>, discountAmount: number, complimentary: number) {
  const tax = num(invoice.taxTotal);
  const same = b.is_gst_same ?? true;
  const half = same ? round2(tax / 2) : 0;
  return {
    order_number: invoice.invoiceNumber,
    created_at: invoice.createdAt,
    total_amount: num(invoice.total),
    discount_amount: discountAmount,
    complimentary_amount: complimentary,
    sgst_amount: half,
    cgst_amount: same ? round2(tax - half) : 0,
    transactions: { gateway_transaction_id: b.gateway_transaction_id ?? b.txnId ?? '' },
  };
}

router.post('/place-order', canBill, async (req, res) => {
  const b = placeInput.parse(req.body);
  const ctx = await ctxOf(req);
  const cart = await cartLines(ctx.userId, ctx.storeId);
  if (!cart.length) throw new HttpError(400, 'Your cart is empty');

  const view = buildView(cart, b.discount_amount ?? 0, b.complimentary_amount ?? 0, b.is_gst_same ?? true);
  await verifyRazorpay(b, view.rounded_grand_total);

  const key = `mobile-${ctx.userId}-${crypto.createHash('sha1').update(JSON.stringify([ctx.storeId, b.gateway_transaction_id ?? b.txnId ?? '', cart.map((l) => [l.id, l.quantity, l.discount]), b.discount_amount ?? 0, b.complimentary_amount ?? 0])).digest('hex').slice(0, 24)}`;
  const invoice = await runCheckout(req, ctx, cart.map((l) => ({ productId: l.productId, quantity: l.quantity, discountAmount: l.discount })), b, 0, 0, key);

  await prisma.mobileCartLine.deleteMany({ where: { userId: ctx.userId, storeId: ctx.storeId } });
  res.status(200).json({ data: receipt(invoice, b, b.discount_amount ?? 0, b.complimentary_amount ?? 0) });
});

router.post('/complete-order', canBill, async (req, res) => {
  const b = placeInput.parse(req.body);
  const ctx = await ctxOf(req);
  const held = await prisma.invoice.findFirst({
    where: { id: String(req.query.order_id ?? ''), storeId: ctx.storeId, status: 'HELD', store: { tenantId: ctx.tenantId } },
    include: heldInclude,
  });
  if (!held) throw new HttpError(404, 'Held order not found');
  if (!held.items.length) throw new HttpError(400, 'This order has no items');

  const discount = b.discount_amount ?? num(held.billDiscountAmount);
  const comp = b.complimentary_amount ?? num(held.complimentaryAmount);
  const lines = orderLines(held.items);
  await verifyRazorpay(b, buildView(lines, discount, comp, b.is_gst_same ?? held.isGstSame).rounded_grand_total);

  const merged = { ...b, is_gst_same: b.is_gst_same ?? held.isGstSame, contact_number: b.contact_number ?? held.customerPhone, seat_number: b.seat_number ?? (held.seatNo ? held.seatNo.split(',').map((s) => s.trim()) : undefined) };
  const invoice = await runCheckout(req, ctx, held.items.map((i) => ({ productId: i.productId, quantity: i.quantity, discountAmount: num(i.discountAmount) })), merged, discount, comp, `mobile-held-${held.id}`);

  // Same hand-off as billing-service's recall: the placeholder is done once
  // the real invoice exists. CANCELLED, not deleted, because online-payment
  // attempts may still reference it.
  await prisma.invoice.update({ where: { id: held.id }, data: { status: 'CANCELLED' } });
  res.status(200).json({ data: receipt(invoice, merged, discount, comp) });
});

// ----------------------------------------------------------------- holds
const holdQuery = z.object({
  is_gst_same: optBool,
  discount_amount: optNum,
  complimentary_amount: optNum,
  order_number: z.string().optional(),
});
const holdBody = z.object({ seat_number: z.array(z.string()).optional(), contact_number: z.string().nullable().optional() });

router.post('/place-draft-order', canBill, async (req, res) => {
  const q = holdQuery.parse(req.query);
  const body = holdBody.parse(req.body ?? {});
  const ctx = await ctxOf(req);
  const seatNo = body.seat_number?.map((s) => s.trim()).filter(Boolean).join(', ') || undefined;
  const phone = body.contact_number?.trim() || undefined;
  if (!seatNo && !phone) throw new HttpError(400, 'Select a seat or enter a contact number to hold the order');

  if (q.order_number) {
    const existing = await prisma.invoice.findFirst({
      where: { id: { endsWith: idFromHoldCode(q.order_number) }, storeId: ctx.storeId, status: 'HELD', store: { tenantId: ctx.tenantId } },
    });
    if (!existing) throw new HttpError(404, 'Held order not found');
    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: existing.id },
        data: { seatNo: seatNo ?? null, customerPhone: phone ?? null, isGstSame: q.is_gst_same ?? existing.isGstSame, label: seatNo ?? phone ?? existing.label },
      });
      await recomputeHeld(tx, existing.id, q.discount_amount, q.complimentary_amount);
    });
    return res.json({ status: true, message: 'Order held' });
  }

  const cart = await prisma.mobileCartLine.findMany({ where: { userId: ctx.userId, storeId: ctx.storeId }, include: { product: true } });
  if (!cart.length) throw new HttpError(400, 'Your cart is empty');
  await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        storeId: ctx.storeId,
        status: 'HELD',
        createdById: ctx.userId,
        label: seatNo ?? phone,
        seatNo,
        customerPhone: phone,
        isGstSame: q.is_gst_same ?? true,
        items: {
          create: cart.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            price: l.product.price,
            gstRate: l.product.gstRate,
            total: 0,
            discountAmount: l.discountAmount,
          })),
        },
      },
    });
    await recomputeHeld(tx, created.id, q.discount_amount ?? 0, q.complimentary_amount ?? 0);
    await tx.mobileCartLine.deleteMany({ where: { userId: ctx.userId, storeId: ctx.storeId } });
  });
  res.json({ status: true, message: 'Order held' });
});

router.get('/draft-order-details/:id', async (req, res) => {
  const ctx = await ctxOf(req);
  const order = await prisma.invoice.findFirst({ where: { id: req.params.id, storeId: ctx.storeId, status: 'HELD', store: { tenantId: ctx.tenantId } } });
  if (!order) throw new HttpError(404, 'Held order not found');
  res.json({
    order: {
      contact_number: order.customerPhone ?? '',
      seats: (order.seatNo ?? '').split(',').map((s) => s.trim()).filter(Boolean).map((seat_number) => ({ seat_number })),
    },
  });
});

// --------------------------------------------------------------- history
const listRow = (i: { id: string; invoiceNumber: string | null; createdAt: Date; paymentMethod: string; total: Prisma.Decimal; customerPhone: string | null; seatNo: string | null }) => ({
  id: i.id,
  order_number: i.invoiceNumber ?? holdCode(i.id),
  created_at: i.createdAt,
  payment_method: titleCaseMethod(i.paymentMethod),
  total_amount: num(i.total),
  contact_number: i.customerPhone ?? '',
  seat_number: i.seatNo ?? '',
});

function dateFilter(q: Request['query']): Prisma.DateTimeFilter | undefined {
  const from = typeof q.from_date === 'string' && q.from_date ? dayStart(q.from_date) : null;
  const to = typeof q.to_date === 'string' && q.to_date ? dayStart(q.to_date) : null;
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lte: dayEnd(to) } : {}) };
}

router.get('/order-history', async (req, res) => {
  const ctx = await ctxOf(req);
  const number = typeof req.query.order_number === 'string' ? req.query.order_number.trim() : '';
  const orders = await prisma.invoice.findMany({
    where: {
      storeId: ctx.storeId,
      status: { in: ['PAID', 'REFUNDED', 'PARTIALLY_PAID'] },
      createdAt: dateFilter(req.query),
      ...(number ? { invoiceNumber: { contains: number, mode: 'insensitive' } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json({ data: { orders: orders.map(listRow) } });
});

router.get('/draft-order-history', async (req, res) => {
  const ctx = await ctxOf(req);
  const number = typeof req.query.order_number === 'string' ? req.query.order_number.trim() : '';
  const orders = await prisma.invoice.findMany({
    where: {
      storeId: ctx.storeId,
      status: 'HELD',
      createdAt: dateFilter(req.query),
      ...(number ? { OR: [{ id: { endsWith: idFromHoldCode(number) } }, { customerPhone: { contains: number } }, { seatNo: { contains: number, mode: 'insensitive' } }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json({ data: { orders: orders.map(listRow) } });
});

// --------------------------------------------------------------- receipts
async function loadOrder(req: Request) {
  const ctx = await ctxOf(req);
  const order = await prisma.invoice.findFirst({
    where: { id: String(req.params.id), storeId: ctx.storeId, store: { tenantId: ctx.tenantId } },
    include: { items: { include: { product: true }, orderBy: { id: 'asc' } }, store: true },
  });
  if (!order) throw new HttpError(404, 'Order not found');
  return order;
}

function totalsOf(o: Awaited<ReturnType<typeof loadOrder>>) {
  const tax = num(o.taxTotal);
  const half = o.isGstSame ? round2(tax / 2) : 0;
  const comp = num(o.complimentaryAmount);
  return {
    price_subtotal: num(o.subtotal),
    // Complimentary is shown on its own line, so it is not repeated here.
    discount_amount: round2(num(o.discountTotal) - comp),
    complimentary_amount: comp,
    sgst_amount: half,
    cgst_amount: o.isGstSame ? round2(tax - half) : 0,
    total_amount: num(o.total),
  };
}

router.get('/order-details/:id', async (req, res) => {
  const o = await loadOrder(req);
  res.json({
    order: {
      order_number: o.invoiceNumber ?? holdCode(o.id),
      created_at: o.createdAt,
      contact_number: o.customerPhone ?? '',
      payment_method: o.status === 'HELD' ? '' : titleCaseMethod(o.paymentMethod),
      seat_number: o.seatNo ?? '',
      items: o.items.map((i) => ({ product: { name: i.product.name }, price: num(i.price), quantity: i.quantity, subtotal: round2(num(i.price) * i.quantity) })),
      ...totalsOf(o),
      transactions: { gateway_transaction_id: o.paymentReference ?? o.posTxnId ?? '' },
    },
    user: {
      vendor: {
        name: o.store.name,
        store_number: o.store.code ?? '',
        store_location: o.store.address ?? '',
        phone: o.store.phone ?? '',
        email: '',
        gst_no: o.store.gstin ?? '',
      },
    },
    pdf_url: null,
  });
});

router.get('/get-order-by-order-id/:id', async (req, res) => {
  const o = await loadOrder(req);
  res.json({
    order: {
      items: o.items.map((i) => ({ product_name: i.product.name, image_url: i.product.imageUrl ?? '', price: num(i.price), quantity: i.quantity })),
      ...totalsOf(o),
    },
  });
});

export { toNum };
export default router;
