import { Router } from 'express';
import { z } from 'zod';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const transferInput = z.object({
  sourceWarehouseId: z.string().min(1),
  destinationWarehouseId: z.string().min(1),
  items: z.array(z.object({ productId: z.string().min(1), qty: z.number().int().positive() })).min(1),
  carrier: z.string().optional(),
});

const include = {
  sourceWarehouse: { select: { id: true, name: true } },
  destinationWarehouse: { select: { id: true, name: true } },
  items: { include: { product: { select: { id: true, name: true, costPrice: true } } } },
} as const;

router.get('/warehouse-transfers', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const transfers = await prisma.warehouseTransfer.findMany({ where: { tenantId }, include, orderBy: { createdAt: 'desc' } });
  res.json(transfers);
});

router.post('/warehouse-transfers', async (req, res) => {
  const parsed = transferInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const { sourceWarehouseId, destinationWarehouseId, items, carrier } = parsed.data;

  if (sourceWarehouseId === destinationWarehouseId) {
    return res.status(400).json({ error: 'Source and destination must be different facilities.' });
  }
  const [source, destination] = await Promise.all([
    prisma.warehouse.findFirst({ where: { id: sourceWarehouseId, tenantId } }),
    prisma.warehouse.findFirst({ where: { id: destinationWarehouseId, tenantId } }),
  ]);
  if (!source || !destination) return res.status(404).json({ error: 'Source or destination warehouse not found' });

  const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) }, tenantId } });
  const costById = new Map(products.map((p) => [p.id, Number(p.costPrice)]));
  const totalValuation = items.reduce((sum, i) => sum + i.qty * (costById.get(i.productId) ?? 0), 0);

  const existingCount = await prisma.warehouseTransfer.count({ where: { tenantId } });
  const transferNumber = `TRF-${6010 + existingCount + 1}`;

  const transfer = await prisma.warehouseTransfer.create({
    data: {
      tenantId,
      transferNumber,
      sourceWarehouseId,
      destinationWarehouseId,
      totalValuation,
      carrier: carrier || 'Apex Express Logistics',
      status: 'IN_TRANSIT',
      items: { create: items.map((i) => ({ productId: i.productId, qty: i.qty })) },
    },
    include,
  });

  res.status(201).json(transfer);
});

router.post('/warehouse-transfers/:id/complete', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const transfer = await prisma.warehouseTransfer.findFirst({ where: { id: req.params.id, tenantId } });
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
  if (transfer.status === 'COMPLETED') return res.status(400).json({ error: 'Transfer is already marked completed' });

  const updated = await prisma.warehouseTransfer.update({
    where: { id: transfer.id },
    data: { status: 'COMPLETED' },
    include,
  });
  res.json(updated);
});

export default router;
