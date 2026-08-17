import { Router } from 'express';
import { z } from 'zod';
import { notifyLowStock } from '@pospe/notifications';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4007';

const adjustmentInput = z.object({
  productId: z.string().min(1),
  action: z.enum(['ADD', 'SUBTRACT']),
  qty: z.number().int().positive(),
  reasonCode: z.string().min(1),
  auditor: z.string().min(1),
});

router.get('/stock-adjustments', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const adjustments = await prisma.stockAdjustment.findMany({
    where: { tenantId },
    include: { product: { select: { id: true, name: true, sku: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(adjustments);
});

// Creating an adjustment takes effect immediately (adjusts Product.stockQty in the
// same transaction) — the pending/approved status is a manager sign-off audit trail,
// not a gate on whether the stock change happened. Matches the KPI math on the
// frontend, which already counts pending adjustments in "Net Quantity Variance".
router.post('/stock-adjustments', async (req, res) => {
  const parsed = adjustmentInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const { productId, action, qty, reasonCode, auditor } = parsed.data;

  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const signedQty = action === 'ADD' ? qty : -qty;
  if (action === 'SUBTRACT' && product.stockQty + signedQty < 0) {
    return res.status(400).json({ error: `Cannot subtract ${qty} units — only ${product.stockQty} in stock.` });
  }

  const valueImpact = signedQty * Number(product.costPrice);

  const [adjustment] = await prisma.$transaction([
    prisma.stockAdjustment.create({
      data: { tenantId, productId, action, qty, reasonCode, auditor, valueImpact },
      include: { product: { select: { id: true, name: true, sku: true } } },
    }),
    prisma.product.update({
      where: { id: productId },
      data: { stockQty: { increment: signedQty } },
    }),
  ]);

  const newQty = product.stockQty + signedQty;
  if (product.stockQty > product.minThreshold && newQty <= product.minThreshold) {
    notifyLowStock(NOTIFICATION_SERVICE_URL, {
      tenantId,
      productName: product.name,
      sku: product.sku,
      stockQty: newQty,
      minThreshold: product.minThreshold,
    });
  }

  res.status(201).json(adjustment);
});

router.post('/stock-adjustments/:id/approve', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.stockAdjustment.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Adjustment not found' });

  const adjustment = await prisma.stockAdjustment.update({
    where: { id: req.params.id },
    data: { status: 'APPROVED' },
    include: { product: { select: { id: true, name: true, sku: true } } },
  });
  res.json(adjustment);
});

export default router;
