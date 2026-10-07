import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const returnItemInput = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const createReturnInput = z.object({
  purchaseOrderId: z.string().min(1),
  items: z.array(returnItemInput).min(1),
  reason: z.string().min(1),
});

const include = {
  items: { include: { product: { select: { id: true, name: true, sku: true } } } },
  purchaseOrder: { select: { id: true, poNumber: true } },
  supplier: { select: { id: true, name: true } },
} as const;

router.get('/purchase-returns', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const returns = await prisma.purchaseReturn.findMany({ where: { tenantId }, include, orderBy: { createdAt: 'desc' } });
  res.json(returns);
});

// The inverse of a GRN — goods physically leaving back to the supplier, so it
// can only cover what was actually received (receivedQty), not the full
// ordered quantity, and it's priced off the PO's own unit price, not a
// client-supplied number.
router.post('/purchase-returns', requirePermission('purchase:manage'), async (req, res) => {
  const parsed = createReturnInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { purchaseOrderId, items, reason } = parsed.data;

  const tenantId = await resolveTenantId(req);
  const order = await prisma.purchaseOrder.findFirst({ where: { id: purchaseOrderId, tenantId }, include: { items: true } });
  if (!order) return res.status(404).json({ error: 'Purchase order not found' });

  const poItemByProduct = new Map(order.items.map((i) => [i.productId, i]));
  for (const requested of items) {
    const poItem = poItemByProduct.get(requested.productId);
    if (!poItem) return res.status(400).json({ error: `Product ${requested.productId} is not on this purchase order` });
    if (requested.quantity > poItem.receivedQty) {
      return res.status(400).json({ error: `Cannot return ${requested.quantity} units — only ${poItem.receivedQty} were received on this order` });
    }
  }

  const lineItems = items.map(({ productId, quantity }) => {
    const poItem = poItemByProduct.get(productId)!;
    return { productId, quantity, unitPrice: Number(poItem.unitPrice) };
  });
  const totalValue = lineItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const existingCount = await prisma.purchaseReturn.count({ where: { tenantId } });
  const returnNumber = `PR-${6000 + existingCount + 1}`;

  try {
    const purchaseReturn = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stockQty: { gte: item.quantity } },
          data: { stockQty: { decrement: item.quantity } },
        });
        if (result.count !== 1) {
          throw Object.assign(new Error(`Insufficient stock to return ${item.quantity} unit(s) of this product`), {
            productId: item.productId,
          });
        }
      }
      return tx.purchaseReturn.create({
        data: {
          tenantId,
          returnNumber,
          purchaseOrderId,
          supplierId: order.supplierId,
          reason,
          totalValue,
          items: { create: lineItems },
        },
        include,
      });
    });
    res.status(201).json(purchaseReturn);
  } catch (err) {
    const productId = (err as { productId?: string }).productId;
    if (productId) return res.status(400).json({ error: (err as Error).message, productId });
    req.log?.error({ err }, 'Failed to record purchase return');
    res.status(500).json({ error: 'Failed to record purchase return' });
  }
});

router.post('/purchase-returns/:id/cancel', requirePermission('purchase:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const existing = await prisma.purchaseReturn.findFirst({ where: { id: req.params.id, tenantId }, include });
  if (!existing) return res.status(404).json({ error: 'Purchase return not found' });
  if (existing.status === 'CANCELLED') return res.status(400).json({ error: 'Purchase return is already cancelled' });

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of existing.items) {
      await tx.product.update({ where: { id: item.productId }, data: { stockQty: { increment: item.quantity } } });
    }
    return tx.purchaseReturn.update({ where: { id: existing.id }, data: { status: 'CANCELLED' }, include });
  });
  res.json(updated);
});

export default router;
