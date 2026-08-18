import { Router } from 'express';
import { z } from 'zod';
import { calcGst } from '@pospe/utilities';
import { prisma, resolveTenantId, resolveStoreId } from '../lib/prisma';

const router = Router();

const heldItemInput = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const holdInvoiceInput = z.object({
  customerId: z.string().optional(),
  items: z.array(heldItemInput).min(1),
  discountPercent: z.number().min(0).max(100).default(0),
  label: z.string().min(1),
});

const splitInvoiceInput = z.object({
  itemIds: z.array(z.string().min(1)).min(1),
});

const mergeInvoicesInput = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
});

const heldInclude = { items: { include: { product: { select: { id: true, name: true } } } } } as const;

// A held bill is an Invoice row with status HELD — no invoiceNumber (only
// sales-service's checkout ever allocates one, when a bill actually gets
// paid) and no stock movement (nothing's been sold yet). Pricing is
// snapshotted at hold time from the real Product row, same as a real
// checkout, so a held bill's total doesn't silently drift if a price
// changes before it's recalled.
router.post('/invoices/hold', async (req, res) => {
  const parsed = holdInvoiceInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { customerId, items, discountPercent, label } = parsed.data;

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined);

  let customerName: string | undefined;
  if (customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    customerName = customer.name;
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, tenantId } });
  if (products.length !== productIds.length) {
    return res.status(404).json({ error: 'One or more products not found' });
  }
  const productById = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  let taxTotal = 0;
  const lineItems = items.map(({ productId, quantity }) => {
    const product = productById.get(productId)!;
    const price = Number(product.price);
    const gstRate = Number(product.gstRate);
    const { amount: lineSubtotal, tax: lineTax } = calcGst(price * quantity, gstRate);
    subtotal += lineSubtotal;
    taxTotal += lineTax;
    return { productId, quantity, price, gstRate, total: lineSubtotal + lineTax };
  });
  const discountAmount = subtotal * (discountPercent / 100);
  const total = subtotal + taxTotal - discountAmount;

  const held = await prisma.invoice.create({
    data: {
      storeId,
      customerId,
      ...(customerName ? { customerName } : {}),
      status: 'HELD',
      label,
      heldDiscountPercent: discountPercent,
      subtotal,
      taxTotal,
      total,
      items: { create: lineItems },
    },
    include: heldInclude,
  });

  res.status(201).json(held);
});

router.get('/invoices/held', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined);

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
router.post('/invoices/:id/recall', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined);

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
    items: held.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      price: Number(item.price),
      gstRate: Number(item.gstRate),
      quantity: item.quantity,
    })),
  });
});

router.delete('/invoices/:id', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined);

  const held = await prisma.invoice.findFirst({ where: { id: req.params.id, storeId, status: 'HELD' } });
  if (!held) return res.status(404).json({ error: 'Held bill not found' });

  // Cancel rather than delete — see the identical note on /recall above.
  await prisma.invoice.update({ where: { id: held.id }, data: { status: 'CANCELLED' } });

  res.status(204).end();
});

router.post('/invoices/:id/split', async (req, res) => {
  const parsed = splitInvoiceInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { itemIds } = parsed.data;

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined);

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

  const splitSubtotal = splitItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const splitTax = splitItems.reduce((sum, i) => sum + (Number(i.total) - Number(i.price) * i.quantity), 0);

  // Interactive transaction, not the array form used elsewhere in this file:
  // reassigning the split items needs the new invoice's generated id, which
  // only exists once the create() above has actually run.
  const newHeld = await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: held.id },
      data: {
        subtotal: { decrement: splitSubtotal },
        taxTotal: { decrement: splitTax },
        total: { decrement: splitSubtotal + splitTax },
      },
    });
    const created = await tx.invoice.create({
      data: {
        storeId,
        customerId: held.customerId,
        customerName: held.customerName,
        status: 'HELD',
        label: `${held.label ?? 'Held bill'} (split)`,
        heldDiscountPercent: held.heldDiscountPercent,
        subtotal: splitSubtotal,
        taxTotal: splitTax,
        total: splitSubtotal + splitTax,
      },
    });
    await tx.invoiceItem.updateMany({
      where: { id: { in: splitItems.map((i) => i.id) } },
      data: { invoiceId: created.id },
    });
    return tx.invoice.findUniqueOrThrow({ where: { id: created.id }, include: heldInclude });
  });

  res.status(201).json(newHeld);
});

router.post('/invoices/merge', async (req, res) => {
  const parsed = mergeInvoicesInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { sourceId, targetId } = parsed.data;
  if (sourceId === targetId) return res.status(400).json({ error: 'sourceId and targetId must differ' });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined);

  const [source, target] = await Promise.all([
    prisma.invoice.findFirst({ where: { id: sourceId, storeId, status: 'HELD' }, include: heldInclude }),
    prisma.invoice.findFirst({ where: { id: targetId, storeId, status: 'HELD' } }),
  ]);
  if (!source || !target) return res.status(404).json({ error: 'One or both held bills not found' });

  const merged = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.updateMany({ where: { invoiceId: source.id }, data: { invoiceId: target.id } });
    const updatedTarget = await tx.invoice.update({
      where: { id: target.id },
      data: {
        subtotal: { increment: source.subtotal },
        taxTotal: { increment: source.taxTotal },
        total: { increment: source.total },
      },
      include: heldInclude,
    });
    await tx.invoice.delete({ where: { id: source.id } });
    return updatedTarget;
  });

  res.json(merged);
});

export default router;
