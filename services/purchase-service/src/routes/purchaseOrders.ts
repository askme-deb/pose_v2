import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';
import { receiveGoods, PurchaseOrderNotFoundError, OverReceiveError } from '../lib/receiving';

const router = Router();

const lineItemInput = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

const poInput = z.object({
  supplierId: z.string().min(1),
  items: z.array(lineItemInput).min(1),
  expectedDeliveryDate: z.string(),
  paymentStatus: z.enum(['PAID', 'PARTIAL', 'UNPAID']).optional(),
  orderStatus: z.enum(['PENDING', 'PARTIALLY_RECEIVED', 'RECEIVED']).optional(),
});

const include = {
  supplier: { select: { id: true, name: true } },
  items: { include: { product: { select: { id: true, name: true } } } },
} as const;

router.get('/purchase-orders', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const orders = await prisma.purchaseOrder.findMany({ where: { tenantId }, include, orderBy: { createdAt: 'desc' } });
  res.json(orders);
});

router.post('/purchase-orders', requirePermission('purchase:manage'), async (req, res) => {
  const parsed = poInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const { supplierId, items, expectedDeliveryDate, paymentStatus, orderStatus } = parsed.data;

  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, tenantId } });
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  const totalAmount = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const existingCount = await prisma.purchaseOrder.count({ where: { tenantId } });
  const poNumber = `PO-${9000 + existingCount + 1}`;

  const order = await prisma.purchaseOrder.create({
    data: {
      tenantId,
      supplierId,
      poNumber,
      totalAmount,
      expectedDeliveryDate: new Date(expectedDeliveryDate),
      paymentStatus: paymentStatus ?? 'UNPAID',
      orderStatus: 'PENDING',
      items: { create: items.map((i) => ({ productId: i.productId, qty: i.qty, unitPrice: i.unitPrice })) },
    },
    include,
  });

  // If issued as already-received (rare, but the create form allows it), that's
  // a real goods receipt — goes through the same GRN transaction as any other
  // receiving does, so stock, receivedQty, and the GRN trail all stay consistent.
  if (orderStatus === 'RECEIVED') {
    await receiveGoods({
      tenantId,
      purchaseOrderId: order.id,
      items: order.items.map((i) => ({ productId: i.productId, receivedQty: i.qty })),
      receivedBy: 'Auto (issued as received)',
    });
  }

  const final = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: order.id }, include });
  res.status(201).json(final);
});

// Quick "receive everything still outstanding" in one shot — goes through the
// same GRN transaction routes/goodsReceivedNotes.ts uses for a partial
// receipt, just pre-filled with every line's full remaining quantity.
router.post('/purchase-orders/:id/receive', requirePermission('purchase:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const order = await prisma.purchaseOrder.findFirst({ where: { id: req.params.id, tenantId }, include: { items: true } });
  if (!order) return res.status(404).json({ error: 'Purchase order not found' });
  if (order.orderStatus === 'RECEIVED') return res.status(400).json({ error: 'Purchase order is already marked received' });

  const remainingItems = order.items.filter((i) => i.receivedQty < i.qty).map((i) => ({ productId: i.productId, receivedQty: i.qty - i.receivedQty }));

  try {
    await receiveGoods({ tenantId, purchaseOrderId: order.id, items: remainingItems, receivedBy: 'Quick Receive' });
    const updated = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: order.id }, include });
    res.json(updated);
  } catch (err) {
    if (err instanceof PurchaseOrderNotFoundError) return res.status(404).json({ error: err.message });
    if (err instanceof OverReceiveError) return res.status(400).json({ error: err.message, productId: err.productId });
    req.log?.error({ err }, 'Failed to receive purchase order');
    res.status(500).json({ error: 'Failed to receive purchase order' });
  }
});

export default router;
