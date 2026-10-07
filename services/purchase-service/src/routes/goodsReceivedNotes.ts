import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';
import { receiveGoods, grnInclude, PurchaseOrderNotFoundError, OverReceiveError, SerialCountMismatchError } from '../lib/receiving';

const router = Router();

const grnItemInput = z.object({
  productId: z.string().min(1),
  receivedQty: z.number().int().positive(),
  batch: z.object({ batchNumber: z.string().min(1), expiryDate: z.string().optional() }).optional(),
  serialNumbers: z.array(z.string().min(1)).optional(),
});

const createGrnInput = z.object({
  purchaseOrderId: z.string().min(1),
  items: z.array(grnItemInput).min(1),
  receivedBy: z.string().min(1),
  notes: z.string().optional(),
});

router.get('/grns', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const where = { tenantId, ...(req.query.purchaseOrderId ? { purchaseOrderId: String(req.query.purchaseOrderId) } : {}) };
  const grns = await prisma.goodsReceivedNote.findMany({ where, include: grnInclude, orderBy: { createdAt: 'desc' } });
  res.json(grns);
});

// Supports receiving less than the full ordered quantity — the PO's status
// becomes PARTIALLY_RECEIVED until a later GRN (or several) closes it out.
router.post('/grns', requirePermission('purchase:manage'), async (req, res) => {
  const parsed = createGrnInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);

  try {
    const grn = await receiveGoods({ tenantId, ...parsed.data });
    res.status(201).json(grn);
  } catch (err) {
    if (err instanceof PurchaseOrderNotFoundError) return res.status(404).json({ error: err.message });
    if (err instanceof OverReceiveError) {
      return res.status(400).json({ error: err.message, productId: err.productId });
    }
    if (err instanceof SerialCountMismatchError) {
      return res.status(400).json({ error: err.message, productId: err.productId });
    }
    req.log?.error({ err }, 'Failed to record goods receipt');
    res.status(500).json({ error: 'Failed to record goods receipt' });
  }
});

export default router;
