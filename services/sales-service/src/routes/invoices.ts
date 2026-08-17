import { Router } from 'express';
import { z } from 'zod';
import { notifyLowStock, type LowStockAlert } from '@pospe/notifications';
import { prisma, resolveTenantId, resolveStoreId } from '../lib/prisma';
import { indexInvoice, indexCustomer } from '../lib/elasticsearch';

const router = Router();

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4007';

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

class InsufficientStockError extends Error {
  constructor(public productId: string, public productName: string) {
    super(`Insufficient stock for ${productName}`);
  }
}

const invoiceInclude = { items: { include: { product: { select: { id: true, name: true } } } } } as const;

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
router.post('/invoices', async (req, res) => {
  const parsed = createInvoiceInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { customerId, paymentMethod, items, discountPercent } = parsed.data;

  // Lets an offline-queued sale be replayed safely once back online: if a
  // previous attempt with this key already succeeded (the client just never
  // saw the response — a flaky sync, not a real duplicate sale), hand back
  // that same invoice instead of creating a second one.
  const idempotencyKey = req.header('idempotency-key') || undefined;
  if (idempotencyKey) {
    const existing = await prisma.invoice.findUnique({ where: { idempotencyKey }, include: invoiceInclude });
    if (existing) return res.status(200).json(existing);
  }

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

  // Populated inside the transaction below (which the closure can reach since
  // it's a plain JS closure), read after the transaction commits — alerts must
  // never fire for a sale that ends up rolled back.
  const lowStockAlerts: LowStockAlert[] = [];
  let updatedCustomer: Awaited<ReturnType<typeof prisma.customer.update>> | undefined;

  try {
    // Interactive transaction (not this file's usual array-form $transaction[]):
    // claiming the invoice number and guarding against overselling both need to
    // read a result and decide whether to keep going before the batch commits,
    // which array-form can't express.
    const invoice = await prisma.$transaction(async (tx) => {
      // TenantProfile.tenantId is unique, so this update serializes concurrent
      // checkouts on that one row — every caller gets a distinct number.
      const profile = await tx.tenantProfile.update({
        where: { tenantId },
        data: { nextInvoiceNumber: { increment: 1 } },
      });
      const invoiceNumber = `${profile.invoicePrefix}${profile.nextInvoiceNumber - 1}`;

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
      const discountAmount = subtotal * (discountPercent / 100);
      const total = subtotal + taxTotal - discountAmount;

      for (const item of items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stockQty: { gte: item.quantity } },
          data: { stockQty: { decrement: item.quantity } },
        });
        if (result.count !== 1) {
          const product = productById.get(item.productId)!;
          throw new InsufficientStockError(product.id, product.name);
        }

        const product = productById.get(item.productId)!;
        const newQty = product.stockQty - item.quantity;
        if (product.stockQty > product.minThreshold && newQty <= product.minThreshold) {
          lowStockAlerts.push({
            tenantId,
            productName: product.name,
            sku: product.sku,
            stockQty: newQty,
            minThreshold: product.minThreshold,
          });
        }
      }

      const created = await tx.invoice.create({
        data: {
          storeId,
          customerId,
          ...(customerName ? { customerName } : {}),
          invoiceNumber,
          status: 'PAID',
          paymentMethod,
          subtotal,
          taxTotal,
          total,
          idempotencyKey,
          items: { create: lineItems },
        },
        include: invoiceInclude,
      });

      if (customerId) {
        const pointsEarned = Math.floor(total / 100);
        if (pointsEarned > 0) {
          updatedCustomer = await tx.customer.update({
            where: { id: customerId },
            data: { loyaltyPoints: { increment: pointsEarned } },
          });
        }
      }

      return created;
    });

    for (const alert of lowStockAlerts) {
      notifyLowStock(NOTIFICATION_SERVICE_URL, alert);
    }
    indexInvoice(invoice);
    if (updatedCustomer) indexCustomer(updatedCustomer);

    res.status(201).json(invoice);
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return res.status(400).json({ error: err.message, productId: err.productId });
    }
    // Two near-simultaneous retries of the same offline sale could both pass
    // the pre-check above before either commits — the unique constraint is
    // what actually prevents the duplicate; this just turns that race into
    // the same "here's your existing invoice" response as the normal case.
    if (idempotencyKey && (err as { code?: string }).code === 'P2002') {
      const existing = await prisma.invoice.findUnique({ where: { idempotencyKey }, include: invoiceInclude });
      if (existing) return res.status(200).json(existing);
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
router.post('/invoices/:id/refund', async (req, res) => {
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
