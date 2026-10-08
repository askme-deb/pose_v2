import { Router } from 'express';
import { z } from 'zod';
import { requirePermission, userHasPermission, HttpError } from '@pospe/permissions';
import { round2 } from '@pospe/utilities';
import { prisma, resolveTenantId, resolveStoreId } from '../lib/prisma';
import { indexInvoice } from '../lib/elasticsearch';
import { checkoutInvoice, CustomerNotFoundError, ProductNotFoundError, InsufficientStockError } from '../lib/checkout';
import { restock } from '../lib/stock';

// Internal service calls carry sub 'system' — not a user to credit the sale to.
const actingUserId = (req: { authUser?: { sub: string } }) => (req.authUser && req.authUser.sub !== 'system' ? req.authUser.sub : undefined);

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:4006';

const router = Router();

const invoiceItemInput = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  // Manual price override for this line. Only honored for callers holding
  // billing:price_override; otherwise price comes from the Product row.
  unitPrice: z.number().nonnegative().optional(),
});

// Optional bill details printed on the receipt (handheld / on-board sales).
// Blank strings are stored as null.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const billDetailsShape = {
  customerPhone: optionalText(20),
  location: optionalText(60),
  seatNo: optionalText(20),
  paymentReference: optionalText(80),
};

const createInvoiceInput = z.object({
  customerId: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'SPLIT']),
  items: z.array(invoiceItemInput).min(1),
  discountPercent: z.number().min(0).max(100).default(0),
  ...billDetailsShape,
});

// Optional filters (all backward compatible: no query = every invoice, as before).
const listQuery = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  status: z.enum(['DRAFT', 'HELD', 'PAID', 'PARTIALLY_PAID', 'REFUNDED', 'CANCELLED']).optional(),
  createdBy: z.enum(['me']).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

router.get('/invoices', async (req, res) => {
  const parsedQuery = listQuery.safeParse(req.query);
  if (!parsedQuery.success) return res.status(400).json({ error: parsedQuery.error.flatten() });
  const { from, to, status, createdBy, limit } = parsedQuery.data;

  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);

  const invoices = await prisma.invoice.findMany({
    where: {
      storeId,
      ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      ...(status ? { status } : {}),
      ...(createdBy === 'me' ? { createdById: actingUserId(req) ?? '__none__' } : {}),
    },
    include: { items: { include: { product: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: 'desc' },
    ...(limit ? { take: limit } : {}),
  });
  res.json(invoices);
});

// Bill creation and payment happen in one step here (no separate DRAFT/HELD
// persistence yet — see useCartStore on the POS frontend for that). Pricing is
// always re-derived from the Product row server-side; the client only ever
// sends productId + quantity, never price/gstRate, so a tampered request can't
// under-charge.
router.post('/invoices', requirePermission('billing:create'), async (req, res) => {
  const parsed = createInvoiceInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (parsed.data.items.some((i) => i.unitPrice !== undefined) && !userHasPermission(req.authUser, 'billing:price_override')) {
    return res.status(403).json({ error: 'Missing required permission: billing:price_override' });
  }

  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);
  // Lets an offline-queued sale be replayed safely once back online: if a
  // previous attempt with this key already succeeded (the client just never
  // saw the response — a flaky sync, not a real duplicate sale), checkoutInvoice
  // hands back that same invoice instead of creating a second one.
  const idempotencyKey = req.header('idempotency-key') || undefined;

  try {
    const { invoice, reused } = await checkoutInvoice({ tenantId, storeId, idempotencyKey, createdById: actingUserId(req), ...parsed.data });
    res.status(reused ? 200 : 201).json(invoice);
  } catch (err) {
    if (err instanceof CustomerNotFoundError) return res.status(404).json({ error: err.message });
    if (err instanceof ProductNotFoundError) return res.status(404).json({ error: err.message });
    if (err instanceof InsufficientStockError) {
      return res.status(400).json({ error: err.message, productId: err.productId });
    }
    // Anything else (including IdempotencyConflictError's 409) goes to the
    // shared errorHandler, which maps status codes and logs real failures.
    throw err;
  }
});

// Whole-invoice refund. Only a PAID invoice can be refunded, exactly once
// (the status flip is a conditional update inside the transaction, so two
// concurrent refunds can't both restock). Quantities already returned via
// credit notes were restocked then and are excluded here; bundles restock
// their components; loyalty points credited at checkout are reversed; and
// any captured online payment is refunded through payment-service.
router.post('/invoices/:id/refund', requirePermission('billing:refund'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);

  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id, storeId },
    include: { items: true, creditNotes: { where: { status: 'ISSUED' }, include: { items: true } }, payments: true },
  });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.status !== 'PAID') {
    return res.status(400).json({
      error: invoice.status === 'REFUNDED' ? 'Invoice is already refunded' : `Only paid invoices can be refunded (this one is ${invoice.status})`,
    });
  }

  const creditedQty = new Map<string, number>();
  let creditedTotal = 0;
  for (const note of invoice.creditNotes) {
    creditedTotal += Number(note.total);
    for (const item of note.items) creditedQty.set(item.productId, (creditedQty.get(item.productId) ?? 0) + item.quantity);
  }
  const restockLines = invoice.items
    .map((item) => {
      // Consume credited quantity line by line (a product can appear twice).
      const alreadyCredited = Math.min(item.quantity, creditedQty.get(item.productId) ?? 0);
      creditedQty.set(item.productId, (creditedQty.get(item.productId) ?? 0) - alreadyCredited);
      return { productId: item.productId, quantity: item.quantity - alreadyCredited };
    })
    .filter((l) => l.quantity > 0);
  const refundAmount = round2(Math.max(0, Number(invoice.total) - creditedTotal));

  const updated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.invoice.updateMany({
      where: { id: invoice.id, status: 'PAID' },
      data: { status: 'REFUNDED', refundedAt: new Date() },
    });
    if (count !== 1) throw new HttpError(409, 'Invoice was refunded by another request');

    await restock(tx, tenantId, restockLines);

    if (invoice.customerId && invoice.loyaltyPointsEarned > 0) {
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: invoice.customerId }, select: { loyaltyPoints: true } });
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: { loyaltyPoints: { decrement: Math.min(customer.loyaltyPoints, invoice.loyaltyPointsEarned) } },
      });
    }

    return tx.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      include: { items: { include: { product: { select: { id: true, name: true } } } } },
    });
  });

  indexInvoice(updated, tenantId);

  // Money back to the customer's card/UPI for online payments. The stock and
  // status changes above stand either way; a failed gateway refund is
  // reported so staff can retry it from the payment record.
  const gatewayRefunds = [];
  let remaining = refundAmount;
  for (const payment of invoice.payments.filter((p) => p.status === 'CAPTURED' || p.status === 'PARTIALLY_REFUNDED')) {
    const refundable = round2(Math.min(remaining, Number(payment.amount) - Number(payment.refundedAmount)));
    if (refundable <= 0) continue;
    remaining = round2(remaining - refundable);
    gatewayRefunds.push(await requestGatewayRefund(payment.id, refundable, req.header('authorization')));
  }

  res.json({ ...updated, refundAmount, gatewayRefunds });
});

async function requestGatewayRefund(paymentId: string, amount: number, authorization?: string) {
  try {
    const response = await fetch(`${PAYMENT_SERVICE_URL}/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authorization ? { authorization } : {}) },
      body: JSON.stringify({ amount }),
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { paymentId, amount, ok: response.ok, ...(response.ok ? { refund: body } : { error: body.error ?? `payment-service returned ${response.status}` }) };
  } catch {
    return { paymentId, amount, ok: false, error: 'payment-service unreachable' };
  }
}

export default router;
