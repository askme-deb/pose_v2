import { Router } from 'express';
import { prisma, resolveTenantId, resolveStoreId } from '../lib/prisma';

const router = Router();

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

  res.json(updated);
});

export default router;
