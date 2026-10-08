import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { computeInvoiceTotals } from '@pospe/utilities';
import { requirePermission, userHasPermission, HttpError } from '@pospe/permissions';
import { prisma, resolveTenantId, resolveStoreId } from '../lib/prisma';

const router = Router();

const heldItemInput = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  // Manual price override, same rule as sales-service checkout: only
  // honored for callers holding billing:price_override.
  unitPrice: z.number().nonnegative().optional(),
});

const holdInvoiceInput = z.object({
  customerId: z.string().optional(),
  items: z.array(heldItemInput).min(1),
  discountPercent: z.number().min(0).max(100).default(0),
  label: z.string().min(1),
  // Receipt bill details, carried onto the invoice when the bill is paid.
  customerPhone: z.string().trim().max(20).optional(),
  location: z.string().trim().max(60).optional(),
  seatNo: z.string().trim().max(20).optional(),
});

const splitInvoiceInput = z.object({
  itemIds: z.array(z.string().min(1)).min(1),
});

const mergeInvoicesInput = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
});

const heldInclude = { items: { include: { product: { select: { id: true, name: true, price: true } } } } } as const;

// A held bill is an Invoice row with status HELD — no invoiceNumber (only
// sales-service's checkout ever allocates one, when a bill actually gets
// paid) and no stock movement (nothing's been sold yet). Pricing is
// snapshotted at hold time from the real Product row, same as a real
// checkout, so a held bill's total doesn't silently drift if a price
// changes before it's recalled.
router.post('/invoices/hold', requirePermission('billing:create'), async (req, res) => {
  const parsed = holdInvoiceInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { customerId, items, discountPercent, label, customerPhone, location, seatNo } = parsed.data;

  if (items.some((i) => i.unitPrice !== undefined) && !userHasPermission(req.authUser, 'billing:price_override')) {
    return res.status(403).json({ error: 'Missing required permission: billing:price_override' });
  }

  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);

  let customerName: string | undefined;
  // Same rule as sales-service checkout: an active membership discount is a
  // floor. Holding at the effective rate keeps the held total equal to the
  // invoice the bill becomes (including when it's paid online).
  let effectiveDiscountPercent = discountPercent;
  if (customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId }, include: { membershipPlan: true } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    customerName = customer.name;
    if (customer.membershipPlan?.isActive) {
      effectiveDiscountPercent = Math.max(effectiveDiscountPercent, Number(customer.membershipPlan.discountPercent));
    }
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, tenantId } });
  if (products.length !== productIds.length) {
    return res.status(404).json({ error: 'One or more products not found' });
  }
  const productById = new Map(products.map((p) => [p.id, p]));

  // Same pricing as sales-service's checkout, so the held total is exactly
  // what the customer will be charged when the bill is completed.
  const totals = computeInvoiceTotals(
    items.map(({ productId, quantity, unitPrice }) => {
      const product = productById.get(productId)!;
      return { productId, quantity, price: unitPrice ?? Number(product.price), gstRate: Number(product.gstRate) };
    }),
    effectiveDiscountPercent,
  );
  const lineItems = totals.lines.map(({ productId, quantity, price, gstRate, total }) => ({ productId, quantity, price, gstRate, total }));
  const { subtotal, discountTotal, taxTotal, total } = totals;

  const held = await prisma.invoice.create({
    data: {
      storeId,
      customerId,
      ...(customerName ? { customerName } : {}),
      status: 'HELD',
      label,
      heldDiscountPercent: effectiveDiscountPercent,
      customerPhone: customerPhone || undefined,
      location: location || undefined,
      seatNo: seatNo || undefined,
      subtotal,
      discountTotal,
      taxTotal,
      total,
      items: { create: lineItems },
    },
    include: heldInclude,
  });

  res.status(201).json(held);
});

router.get('/invoices/held', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);

  const held = await prisma.invoice.findMany({
    where: { storeId, status: 'HELD' },
    include: heldInclude,
    orderBy: { createdAt: 'asc' },
  });
  res.json(held);
});

// Recall hands the held bill's contents back to the POS terminal and
// consumes the hold — the frontend loads the returned items into its active
// cart and completes the sale through sales-service's existing checkout
// exactly as it would for a fresh cart. That keeps the complex checkout
// transaction (stock, GST, idempotency, loyalty, alerts, search indexing) a
// single source of truth instead of a second copy living here.
router.post('/invoices/:id/recall', requirePermission('billing:create'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);

  const held = await prisma.invoice.findFirst({
    where: { id: req.params.id, storeId, status: 'HELD' },
    include: heldInclude,
  });
  if (!held) return res.status(404).json({ error: 'Held bill not found' });

  // Cancel rather than delete: a Payment row (an online-payment attempt on
  // this held bill) may reference this invoice, and Postgres correctly
  // rejects deleting a row something still points to. CANCELLED also reads
  // more honestly here — this placeholder is done, superseded by whatever
  // real invoice the frontend creates next through sales-service's checkout.
  await prisma.invoice.update({ where: { id: held.id }, data: { status: 'CANCELLED' } });

  res.json({
    customerId: held.customerId,
    customerName: held.customerName,
    discountPercent: held.heldDiscountPercent ? Number(held.heldDiscountPercent) : 0,
    customerPhone: held.customerPhone,
    location: held.location,
    seatNo: held.seatNo,
    items: held.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      price: Number(item.price),
      catalogPrice: Number(item.product.price),
      gstRate: Number(item.gstRate),
      quantity: item.quantity,
    })),
  });
});

router.delete('/invoices/:id', requirePermission('billing:create'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);

  const held = await prisma.invoice.findFirst({ where: { id: req.params.id, storeId, status: 'HELD' } });
  if (!held) return res.status(404).json({ error: 'Held bill not found' });

  // Cancel rather than delete — see the identical note on /recall above.
  await prisma.invoice.update({ where: { id: held.id }, data: { status: 'CANCELLED' } });

  res.status(204).end();
});

router.post('/invoices/:id/split', requirePermission('billing:create'), async (req, res) => {
  const parsed = splitInvoiceInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { itemIds } = parsed.data;

  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);

  const held = await prisma.invoice.findFirst({
    where: { id: req.params.id, storeId, status: 'HELD' },
    include: heldInclude,
  });
  if (!held) return res.status(404).json({ error: 'Held bill not found' });

  const idsToSplit = new Set(itemIds);
  const splitItems = held.items.filter((i) => idsToSplit.has(i.id));
  if (splitItems.length !== itemIds.length) {
    return res.status(400).json({ error: 'One or more item IDs do not belong to this held bill' });
  }
  if (splitItems.length === held.items.length) {
    return res.status(400).json({ error: 'Cannot split every item — at least one must remain on the original bill' });
  }

  // Interactive transaction, not the array form used elsewhere in this file:
  // reassigning the split items needs the new invoice's generated id, which
  // only exists once the create() above has actually run.
  const newHeld = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        storeId,
        customerId: held.customerId,
        customerName: held.customerName,
        status: 'HELD',
        label: `${held.label ?? 'Held bill'} (split)`,
        heldDiscountPercent: held.heldDiscountPercent,
      },
    });
    await tx.invoiceItem.updateMany({
      where: { id: { in: splitItems.map((i) => i.id) } },
      data: { invoiceId: created.id },
    });
    await recomputeHeldTotals(tx, held.id);
    await recomputeHeldTotals(tx, created.id);
    return tx.invoice.findUniqueOrThrow({ where: { id: created.id }, include: heldInclude });
  });

  res.status(201).json(newHeld);
});

router.post('/invoices/merge', requirePermission('billing:create'), async (req, res) => {
  const parsed = mergeInvoicesInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { sourceId, targetId } = parsed.data;
  if (sourceId === targetId) return res.status(400).json({ error: 'sourceId and targetId must differ' });

  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);

  const [source, target] = await Promise.all([
    prisma.invoice.findFirst({ where: { id: sourceId, storeId, status: 'HELD' }, include: { ...heldInclude, payments: true } }),
    prisma.invoice.findFirst({ where: { id: targetId, storeId, status: 'HELD' } }),
  ]);
  if (!source || !target) return res.status(404).json({ error: 'One or both held bills not found' });
  // An online payment may already be in flight for the source bill; merging
  // it away would leave that payment pointing at nothing billable.
  if (source.payments.length > 0) {
    return res.status(409).json({ error: 'This held bill has an online payment attached and cannot be merged' });
  }

  const merged = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.updateMany({ where: { invoiceId: source.id }, data: { invoiceId: target.id } });
    await tx.invoice.delete({ where: { id: source.id } });
    // The merged bill takes the target's discount, re-priced over all items.
    await recomputeHeldTotals(tx, target.id);
    return tx.invoice.findUniqueOrThrow({ where: { id: target.id }, include: heldInclude });
  });

  res.json(merged);
});

// Re-derives a held bill's totals from its line items and held discount —
// used after split/merge move items between bills.
async function recomputeHeldTotals(tx: Prisma.TransactionClient, invoiceId: string) {
  const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { items: true } });
  if (!invoice) throw new HttpError(404, 'Held bill not found');
  const totals = computeInvoiceTotals(
    invoice.items.map((i) => ({ id: i.id, price: Number(i.price), quantity: i.quantity, gstRate: Number(i.gstRate) })),
    invoice.heldDiscountPercent ? Number(invoice.heldDiscountPercent) : 0,
  );
  for (const line of totals.lines) {
    await tx.invoiceItem.update({ where: { id: line.id }, data: { total: line.total } });
  }
  await tx.invoice.update({
    where: { id: invoiceId },
    data: { subtotal: totals.subtotal, discountTotal: totals.discountTotal, taxTotal: totals.taxTotal, total: totals.total },
  });
}

export default router;
