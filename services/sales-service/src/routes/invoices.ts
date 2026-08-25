import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId, resolveStoreId } from '../lib/prisma';
import { indexInvoice } from '../lib/elasticsearch';
import { checkoutInvoice, CustomerNotFoundError, ProductNotFoundError, InsufficientStockError } from '../lib/checkout';

const router = Router();

const invoiceItemInput = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const createInvoiceInput = z.object({
  customerId: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'SPLIT']),
  items: z.array(invoiceItemInput).min(1),
  discountPercent: z.number().min(0).max(100).default(0),
});

router.get('/invoices', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined);

  const invoices = await prisma.invoice.findMany({
    where: { storeId },
    include: { items: { include: { product: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: 'desc' },
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

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined);
  // Lets an offline-queued sale be replayed safely once back online: if a
  // previous attempt with this key already succeeded (the client just never
  // saw the response — a flaky sync, not a real duplicate sale), checkoutInvoice
  // hands back that same invoice instead of creating a second one.
  const idempotencyKey = req.header('idempotency-key') || undefined;

  try {
    const { invoice, reused } = await checkoutInvoice({ tenantId, storeId, idempotencyKey, ...parsed.data });
    res.status(reused ? 200 : 201).json(invoice);
  } catch (err) {
    if (err instanceof CustomerNotFoundError) return res.status(404).json({ error: err.message });
    if (err instanceof ProductNotFoundError) return res.status(404).json({ error: err.message });
    if (err instanceof InsufficientStockError) {
      return res.status(400).json({ error: err.message, productId: err.productId });
    }
    // Express 4 doesn't forward a thrown/rejected error from an async handler
    // to any error middleware on its own — left unhandled, it crashes the
    // whole process. A single bad request should return 500, not take down
    // every other in-flight request too.
    req.log?.error({ err }, 'Failed to create invoice');
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Refunding restocks the sold quantities in the same transaction — this is a real
// business rule (money and stock both move), not just a status flip.
router.post('/invoices/:id/refund', requirePermission('billing:create'), async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined);

  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id, storeId },
    include: { items: true },
  });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.status === 'REFUNDED') return res.status(400).json({ error: 'Invoice is already refunded' });

  const [updated] = await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'REFUNDED' },
      include: { items: { include: { product: { select: { id: true, name: true } } } } },
    }),
    ...invoice.items.map((item) =>
      prisma.product.update({
        where: { id: item.productId },
        data: { stockQty: { increment: item.quantity } },
      }),
    ),
  ]);

  indexInvoice(updated);
  res.json(updated);
});

export default router;
