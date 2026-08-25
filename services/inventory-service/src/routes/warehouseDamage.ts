import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const include = {
  warehouse: { select: { id: true, name: true } },
  rack: { select: { id: true, code: true } },
  product: { select: { id: true, name: true, sku: true } },
} as const;

router.get('/warehouse-damage-reports', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const where = { tenantId, ...(req.query.warehouseId ? { warehouseId: String(req.query.warehouseId) } : {}) };
  const reports = await prisma.warehouseDamageReport.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  res.json(reports);
});

const createDamageInput = z.object({
  warehouseId: z.string().min(1),
  rackId: z.string().optional(),
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  reason: z.string().min(1),
  reportedBy: z.string().min(1),
});

// The real write-off: pulls the damaged units out of sellable stock (guarded
// against removing more than exists), logs it both as a warehouse-specific
// damage report and as a normal StockAdjustment — the same audit log every
// other shrinkage entry already appears in, so nobody has to check two places.
router.post('/warehouse-damage-reports', requirePermission('inventory:manage'), async (req, res) => {
  const parsed = createDamageInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { warehouseId, rackId, productId, quantity, reason, reportedBy } = parsed.data;

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const warehouse = await prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId } });
  if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });

  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (quantity > product.stockQty) {
    return res.status(400).json({ error: `Cannot write off ${quantity} units — only ${product.stockQty} in stock` });
  }

  let rack = null;
  if (rackId) {
    rack = await prisma.warehouseRack.findFirst({ where: { id: rackId, tenantId, warehouseId } });
    if (!rack) return res.status(404).json({ error: 'Rack not found in this warehouse' });
  }

  const valueImpact = quantity * Number(product.costPrice);

  const [report] = await prisma.$transaction([
    prisma.warehouseDamageReport.create({
      data: { tenantId, warehouseId, rackId, productId, quantity, reason, reportedBy, valueImpact },
      include,
    }),
    prisma.product.update({ where: { id: productId }, data: { stockQty: { decrement: quantity } } }),
    prisma.stockAdjustment.create({
      data: {
        tenantId,
        productId,
        action: 'SUBTRACT',
        qty: quantity,
        reasonCode: `Warehouse damage — ${reason}`,
        auditor: reportedBy,
        valueImpact: -valueImpact,
        status: 'APPROVED',
      },
    }),
    ...(rack
      ? [
          prisma.warehouseRackItem.updateMany({
            where: { rackId: rack.id, productId },
            data: { quantity: { decrement: quantity } },
          }),
        ]
      : []),
  ]);

  res.status(201).json(report);
});

export default router;
