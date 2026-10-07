import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId, resolveStoreId } from '../lib/prisma';

const router = Router();

const challanItemInput = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const createChallanInput = z.object({
  customerId: z.string().optional(),
  items: z.array(challanItemInput).min(1),
  vehicleNumber: z.string().optional(),
  transporterName: z.string().optional(),
  linkedInvoiceId: z.string().optional(),
  notes: z.string().optional(),
});

const include = {
  items: { include: { product: { select: { id: true, name: true, sku: true } } } },
  customer: { select: { id: true, name: true } },
} as const;

router.get('/delivery-challans', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);
  const challans = await prisma.deliveryChallan.findMany({ where: { storeId }, include, orderBy: { createdAt: 'desc' } });
  res.json(challans);
});

router.post('/delivery-challans', requirePermission('sales:manage'), async (req, res) => {
  const parsed = createChallanInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { customerId, items, vehicleNumber, transporterName, linkedInvoiceId, notes } = parsed.data;

  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);

  let customerName: string | undefined;
  if (customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    customerName = customer.name;
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, tenantId } });
  if (products.length !== productIds.length) return res.status(404).json({ error: 'One or more products not found' });

  const existingCount = await prisma.deliveryChallan.count({ where: { tenantId } });
  const challanNumber = `DC-${5000 + existingCount + 1}`;

  const challan = await prisma.deliveryChallan.create({
    data: {
      tenantId,
      storeId,
      challanNumber,
      customerId,
      ...(customerName ? { customerName } : {}),
      vehicleNumber,
      transporterName,
      linkedInvoiceId,
      notes,
      items: { create: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) },
    },
    include,
  });
  res.status(201).json(challan);
});

// Dispatching is the real stock movement — goods are physically leaving the
// store ahead of (or without) a formal invoice, guarded against overselling
// the same way checkout is.
router.post('/delivery-challans/:id/dispatch', requirePermission('sales:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const challan = await prisma.deliveryChallan.findFirst({ where: { id: req.params.id, tenantId }, include });
  if (!challan) return res.status(404).json({ error: 'Delivery challan not found' });
  if (challan.status !== 'DRAFT') return res.status(400).json({ error: 'Only a draft challan can be dispatched' });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      for (const item of challan.items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stockQty: { gte: item.quantity } },
          data: { stockQty: { decrement: item.quantity } },
        });
        if (result.count !== 1) {
          throw Object.assign(new Error(`Insufficient stock for ${item.product.name}`), { productId: item.productId });
        }
      }
      return tx.deliveryChallan.update({
        where: { id: challan.id },
        data: { status: 'DISPATCHED', dispatchedAt: new Date() },
        include,
      });
    });
    res.json(updated);
  } catch (err) {
    const productId = (err as { productId?: string }).productId;
    if (productId) return res.status(400).json({ error: (err as Error).message, productId });
    req.log?.error({ err }, 'Failed to dispatch delivery challan');
    res.status(500).json({ error: 'Failed to dispatch delivery challan' });
  }
});

router.post('/delivery-challans/:id/deliver', requirePermission('sales:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const existing = await prisma.deliveryChallan.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Delivery challan not found' });
  if (existing.status !== 'DISPATCHED') return res.status(400).json({ error: 'Only a dispatched challan can be marked delivered' });

  const updated = await prisma.deliveryChallan.update({ where: { id: existing.id }, data: { status: 'DELIVERED' }, include });
  res.json(updated);
});

// Cancelling after dispatch restocks what left — before dispatch nothing ever
// moved, so it's a plain status flip.
router.post('/delivery-challans/:id/cancel', requirePermission('sales:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const existing = await prisma.deliveryChallan.findFirst({ where: { id: req.params.id, tenantId }, include });
  if (!existing) return res.status(404).json({ error: 'Delivery challan not found' });
  if (existing.status === 'CANCELLED' || existing.status === 'DELIVERED') {
    return res.status(400).json({ error: `Cannot cancel a ${existing.status.toLowerCase()} challan` });
  }

  const wasDispatched = existing.status === 'DISPATCHED';
  const updated = await prisma.$transaction(async (tx) => {
    if (wasDispatched) {
      for (const item of existing.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stockQty: { increment: item.quantity } } });
      }
    }
    return tx.deliveryChallan.update({ where: { id: existing.id }, data: { status: 'CANCELLED' }, include });
  });
  res.json(updated);
});

router.delete('/delivery-challans/:id', requirePermission('sales:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const existing = await prisma.deliveryChallan.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Delivery challan not found' });
  if (existing.status !== 'DRAFT') return res.status(400).json({ error: 'Only a draft challan can be deleted' });

  await prisma.$transaction([
    prisma.deliveryChallanItem.deleteMany({ where: { deliveryChallanId: existing.id } }),
    prisma.deliveryChallan.delete({ where: { id: existing.id } }),
  ]);
  res.status(204).end();
});

export default router;
