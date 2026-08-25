import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId, resolveStoreId } from '../lib/prisma';
import { checkoutInvoice, CustomerNotFoundError, ProductNotFoundError, InsufficientStockError } from '../lib/checkout';

const router = Router();

const quoteItemInput = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const createQuoteInput = z.object({
  kind: z.enum(['QUOTATION', 'ESTIMATE']).default('QUOTATION'),
  customerId: z.string().optional(),
  items: z.array(quoteItemInput).min(1),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});

const include = {
  items: { include: { product: { select: { id: true, name: true, sku: true } } } },
  customer: { select: { id: true, name: true } },
} as const;

const numberPrefix = { QUOTATION: 'QT', ESTIMATE: 'ES' } as const;

router.get('/quotations', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined);
  const kind = req.query.kind === 'ESTIMATE' ? 'ESTIMATE' : req.query.kind === 'QUOTATION' ? 'QUOTATION' : undefined;

  const quotes = await prisma.salesQuote.findMany({
    where: { storeId, ...(kind ? { kind } : {}) },
    include,
    orderBy: { createdAt: 'desc' },
  });
  res.json(quotes);
});

// Pricing is re-derived from the live Product row, same rule checkout
// follows — a quote reflects what the customer would actually pay today, not
// a client-supplied number.
router.post('/quotations', requirePermission('sales:manage'), async (req, res) => {
  const parsed = createQuoteInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { kind, customerId, items, validUntil, notes } = parsed.data;

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
  if (products.length !== productIds.length) return res.status(404).json({ error: 'One or more products not found' });
  const productById = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  let taxTotal = 0;
  const lineItems = items.map(({ productId, quantity }) => {
    const product = productById.get(productId)!;
    const price = Number(product.price);
    const gstRate = Number(product.gstRate);
    const lineSubtotal = price * quantity;
    const lineTax = Math.round(lineSubtotal * (gstRate / 100) * 100) / 100;
    subtotal += lineSubtotal;
    taxTotal += lineTax;
    return { productId, quantity, price, gstRate, total: lineSubtotal + lineTax };
  });
  const total = subtotal + taxTotal;

  const existingCount = await prisma.salesQuote.count({ where: { tenantId, kind } });
  const quoteNumber = `${numberPrefix[kind]}-${1000 + existingCount + 1}`;

  const quote = await prisma.salesQuote.create({
    data: {
      tenantId,
      storeId,
      quoteNumber,
      kind,
      customerId,
      ...(customerName ? { customerName } : {}),
      validUntil: validUntil ? new Date(validUntil) : undefined,
      notes,
      subtotal,
      taxTotal,
      total,
      items: { create: lineItems },
    },
    include,
  });
  res.status(201).json(quote);
});

const updateQuoteInput = z.object({
  notes: z.string().optional(),
  validUntil: z.string().optional(),
});

router.put('/quotations/:id', requirePermission('sales:manage'), async (req, res) => {
  const parsed = updateQuoteInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.salesQuote.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Quotation not found' });
  if (existing.status !== 'DRAFT') return res.status(400).json({ error: 'Only a draft quotation can be edited' });

  const { notes, validUntil } = parsed.data;
  const quote = await prisma.salesQuote.update({
    where: { id: existing.id },
    data: { notes, validUntil: validUntil ? new Date(validUntil) : undefined },
    include,
  });
  res.json(quote);
});

type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';

async function transition(req: Request, res: Response, from: QuoteStatus[], to: QuoteStatus) {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.salesQuote.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Quotation not found' });
  if (!from.includes(existing.status as QuoteStatus)) {
    return res.status(400).json({ error: `Cannot move a ${existing.status.toLowerCase()} quotation to ${to.toLowerCase()}` });
  }
  const quote = await prisma.salesQuote.update({ where: { id: existing.id }, data: { status: to }, include });
  res.json(quote);
}

router.post('/quotations/:id/send', requirePermission('sales:manage'), (req, res) => transition(req, res, ['DRAFT'], 'SENT'));
router.post('/quotations/:id/accept', requirePermission('sales:manage'), (req, res) =>
  transition(req, res, ['SENT'], 'ACCEPTED'),
);
router.post('/quotations/:id/reject', requirePermission('sales:manage'), (req, res) =>
  transition(req, res, ['SENT'], 'REJECTED'),
);

// Converting is the one action that actually moves money and stock — it runs
// the same checkoutInvoice transaction a POS sale does, so an accepted quote
// becomes a real, correctly-numbered invoice rather than a second bookkeeping
// trail that has to be reconciled against the real one later.
router.post('/quotations/:id/convert', requirePermission('sales:manage'), async (req, res) => {
  const paymentMethod = z.enum(['CASH', 'UPI', 'CARD', 'SPLIT']).default('CASH').parse(req.body?.paymentMethod ?? 'CASH');

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined);
  const quote = await prisma.salesQuote.findFirst({ where: { id: req.params.id, tenantId }, include });
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });
  if (quote.status === 'CONVERTED') return res.status(400).json({ error: 'Quotation was already converted' });
  if (quote.status === 'REJECTED' || quote.status === 'EXPIRED') {
    return res.status(400).json({ error: `Cannot convert a ${quote.status.toLowerCase()} quotation` });
  }

  try {
    const { invoice } = await checkoutInvoice({
      tenantId,
      storeId,
      customerId: quote.customerId ?? undefined,
      paymentMethod,
      items: quote.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      discountPercent: 0,
    });

    const updated = await prisma.salesQuote.update({
      where: { id: quote.id },
      data: { status: 'CONVERTED', convertedInvoiceId: invoice.id },
      include: { ...include, convertedInvoice: true },
    });
    res.json(updated);
  } catch (err) {
    if (err instanceof CustomerNotFoundError) return res.status(404).json({ error: err.message });
    if (err instanceof ProductNotFoundError) return res.status(404).json({ error: err.message });
    if (err instanceof InsufficientStockError) return res.status(400).json({ error: err.message, productId: err.productId });
    req.log?.error({ err }, 'Failed to convert quotation to invoice');
    res.status(500).json({ error: 'Failed to convert quotation' });
  }
});

router.delete('/quotations/:id', requirePermission('sales:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.salesQuote.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Quotation not found' });
  if (existing.status !== 'DRAFT') return res.status(400).json({ error: 'Only a draft quotation can be deleted' });

  await prisma.$transaction([
    prisma.salesQuoteItem.deleteMany({ where: { salesQuoteId: existing.id } }),
    prisma.salesQuote.delete({ where: { id: existing.id } }),
  ]);
  res.status(204).end();
});

export default router;
