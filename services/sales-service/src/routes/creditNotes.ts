import { Router } from 'express';
import { z } from 'zod';
import { requirePermission, HttpError } from '@pospe/permissions';
import { computeInvoiceTotals, round2 } from '@pospe/utilities';
import { prisma, resolveTenantId, resolveStoreId } from '../lib/prisma';
import { restock, unstock } from '../lib/stock';

const router = Router();

const creditItemInput = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const createCreditNoteInput = z.object({
  invoiceId: z.string().min(1),
  items: z.array(creditItemInput).min(1),
  reason: z.string().min(1),
});

const include = {
  items: { include: { product: { select: { id: true, name: true, sku: true } } } },
  invoice: { select: { id: true, invoiceNumber: true } },
} as const;

router.get('/credit-notes', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);
  const notes = await prisma.creditNote.findMany({ where: { storeId }, include, orderBy: { createdAt: 'desc' } });
  res.json(notes);
});

// More granular than the existing whole-invoice /invoices/:id/refund: this
// covers a partial return, is priced off exactly what the original invoice
// line charged (not today's live product price), and restocks only the
// quantities it actually lists.
router.post('/credit-notes', requirePermission('sales:manage'), async (req, res) => {
  const parsed = createCreditNoteInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { invoiceId, items, reason } = parsed.data;

  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, storeId },
    include: { items: true, creditNotes: { where: { status: 'ISSUED' }, include: { items: true } } },
  });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.status !== 'PAID') {
    return res.status(400).json({ error: `Credit notes can only be issued against paid invoices (this one is ${invoice.status})` });
  }

  // Quantities sold minus quantities already credited by earlier notes, so
  // repeated partial returns can never exceed what was actually sold.
  const soldQty = new Map<string, number>();
  const linePrice = new Map<string, { price: number; gstRate: number }>();
  for (const i of invoice.items) {
    soldQty.set(i.productId, (soldQty.get(i.productId) ?? 0) + i.quantity);
    linePrice.set(i.productId, { price: Number(i.price), gstRate: Number(i.gstRate) });
  }
  for (const note of invoice.creditNotes) {
    for (const i of note.items) soldQty.set(i.productId, (soldQty.get(i.productId) ?? 0) - i.quantity);
  }
  for (const requested of items) {
    const available = soldQty.get(requested.productId);
    if (available === undefined) {
      return res.status(400).json({ error: `Product ${requested.productId} was not on this invoice` });
    }
    if (requested.quantity > available) {
      return res.status(400).json({ error: `Cannot credit ${requested.quantity} units — only ${available} remain uncredited on this invoice` });
    }
  }

  // Priced exactly like the original sale: same unit price, and the same
  // invoice-level discount applied before GST.
  const invoiceDiscountPercent = Number(invoice.subtotal) > 0 ? (Number(invoice.discountTotal) / Number(invoice.subtotal)) * 100 : 0;
  const totals = computeInvoiceTotals(
    items.map(({ productId, quantity }) => ({ productId, quantity, ...linePrice.get(productId)! })),
    invoiceDiscountPercent,
  );
  const lineItems = totals.lines.map(({ productId, quantity, price, gstRate, total }) => ({ productId, quantity, price, gstRate, total }));
  // Credit notes store net (post-discount) subtotal: subtotal + taxTotal = total.
  const subtotal = round2(totals.subtotal - totals.discountTotal);
  const { taxTotal, total } = totals;

  const existingCount = await prisma.creditNote.count({ where: { tenantId } });
  const creditNoteNumber = `CN-${7000 + existingCount + 1}`;

  const creditNote = await prisma.$transaction(async (tx) => {
    await restock(tx, tenantId, items);
    return tx.creditNote.create({
      data: {
        tenantId,
        storeId,
        creditNoteNumber,
        invoiceId,
        customerName: invoice.customerName,
        reason,
        subtotal,
        taxTotal,
        total,
        items: { create: lineItems },
      },
      include,
    });
  });

  res.status(201).json(creditNote);
});

// Reverses the restock — for when a credit note was issued in error.
router.post('/credit-notes/:id/cancel', requirePermission('sales:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const existing = await prisma.creditNote.findFirst({ where: { id: req.params.id, tenantId }, include });
  if (!existing) return res.status(404).json({ error: 'Credit note not found' });
  if (existing.status === 'CANCELLED') return res.status(400).json({ error: 'Credit note is already cancelled' });

  const updated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.creditNote.updateMany({ where: { id: existing.id, status: 'ISSUED' }, data: { status: 'CANCELLED' } });
    if (count !== 1) throw new HttpError(409, 'Credit note is already cancelled');
    await unstock(tx, tenantId, existing.items);
    return tx.creditNote.findUniqueOrThrow({ where: { id: existing.id }, include });
  });
  res.json(updated);
});

export default router;
