import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const include = {
  product: { select: { id: true, name: true, sku: true } },
} as const;

router.get('/products/:id/batches', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const batches = await prisma.productBatch.findMany({
    where: { productId: req.params.id, tenantId },
    include,
    orderBy: { expiryDate: 'asc' },
  });
  res.json(batches);
});

// FEFO expiry report — every batch (across every product) expiring within
// the window, soonest first, so a manager can act on what's about to go bad
// without having to open each product one at a time.
router.get('/batches/expiring', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const days = Math.max(0, Number(req.query.days) || 30);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const batches = await prisma.productBatch.findMany({
    where: { tenantId, quantity: { gt: 0 }, expiryDate: { not: null, lte: cutoff } },
    include,
    orderBy: { expiryDate: 'asc' },
  });
  res.json(batches);
});

const adjustInput = z.object({
  quantity: z.number().int().nonnegative(),
  reason: z.string().min(1),
});

// Corrects a single batch's remaining quantity (e.g. writing off an expired
// lot) — the delta also moves Product.stockQty so the aggregate stays in
// sync with the batch breakdown behind it.
router.post('/batches/:id/adjust', requirePermission('inventory:manage'), async (req, res) => {
  const parsed = adjustInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const batch = await prisma.productBatch.findFirst({ where: { id: req.params.id, tenantId } });
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const delta = parsed.data.quantity - batch.quantity;

  const [updated] = await prisma.$transaction([
    prisma.productBatch.update({ where: { id: batch.id }, data: { quantity: parsed.data.quantity }, include }),
    prisma.product.update({ where: { id: batch.productId }, data: { stockQty: { increment: delta } } }),
    prisma.stockAdjustment.create({
      data: {
        tenantId,
        productId: batch.productId,
        action: delta >= 0 ? 'ADD' : 'SUBTRACT',
        qty: Math.abs(delta),
        reasonCode: parsed.data.reason,
        auditor: 'Batch Adjustment',
        valueImpact: delta * Number(batch.costPrice),
        status: 'APPROVED',
      },
    }),
  ]);

  res.json(updated);
});

export default router;
