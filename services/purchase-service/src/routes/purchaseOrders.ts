import { Router } from 'express';
import { z } from 'zod';
import { prisma, resolveTenantId } from '../lib/prisma';

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
  orderStatus: z.enum(['PENDING', 'RECEIVED']).optional(),
});

const include = {
  supplier: { select: { id: true, name: true } },
  items: { include: { product: { select: { id: true, name: true } } } },
} as const;

router.get('/purchase-orders', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const orders = await prisma.purchaseOrder.findMany({ where: { tenantId }, include, orderBy: { createdAt: 'desc' } });
  res.json(orders);
});

router.post('/purchase-orders', async (req, res) => {
  const parsed = poInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
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
      orderStatus: orderStatus ?? 'PENDING',
      items: { create: items.map((i) => ({ productId: i.productId, qty: i.qty, unitPrice: i.unitPrice })) },
    },
    include,
  });

  // If issued as already-received (rare, but the create form allows it), stock
  // should reflect that immediately — same rule the dedicated /receive endpoint
  // applies.
  if (order.orderStatus === 'RECEIVED') {
    await prisma.$transaction(order.items.map((i) => prisma.product.update({ where: { id: i.productId }, data: { stockQty: { increment: i.qty } } })));
  }

  res.status(201).json(order);
});

// Marking a PO received is a GRN (goods received note) — it's the point stock
// actually enters inventory, not PO creation. Restocking happens in the same
// transaction as the status flip.
router.post('/purchase-orders/:id/receive', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const order = await prisma.purchaseOrder.findFirst({ where: { id: req.params.id, tenantId }, include: { items: true } });
  if (!order) return res.status(404).json({ error: 'Purchase order not found' });
  if (order.orderStatus === 'RECEIVED') return res.status(400).json({ error: 'Purchase order is already marked received' });

  const [updated] = await prisma.$transaction([
    prisma.purchaseOrder.update({ where: { id: order.id }, data: { orderStatus: 'RECEIVED' }, include }),
    ...order.items.map((i) => prisma.product.update({ where: { id: i.productId }, data: { stockQty: { increment: i.qty } } })),
  ]);

  res.json(updated);
});

export default router;
