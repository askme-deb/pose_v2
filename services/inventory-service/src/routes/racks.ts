import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const rackInclude = {
  items: { include: { product: { select: { id: true, name: true, sku: true } } } },
} as const;

router.get('/warehouses/:id/racks', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const racks = await prisma.warehouseRack.findMany({
    where: { warehouseId: req.params.id, tenantId },
    include: rackInclude,
    orderBy: { code: 'asc' },
  });
  res.json(racks);
});

const createRackInput = z.object({
  code: z.string().min(1),
  capacity: z.number().int().positive().optional(),
});

router.post('/warehouses/:id/racks', requirePermission('inventory:manage'), async (req, res) => {
  const parsed = createRackInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const warehouse = await prisma.warehouse.findFirst({ where: { id: req.params.id, tenantId } });
  if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });

  const existing = await prisma.warehouseRack.findFirst({ where: { warehouseId: warehouse.id, code: parsed.data.code } });
  if (existing) return res.status(400).json({ error: `Rack ${parsed.data.code} already exists in this warehouse` });

  const rack = await prisma.warehouseRack.create({
    data: { tenantId, warehouseId: warehouse.id, code: parsed.data.code, capacity: parsed.data.capacity },
    include: rackInclude,
  });
  res.status(201).json(rack);
});

router.delete('/racks/:id', requirePermission('inventory:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const rack = await prisma.warehouseRack.findFirst({ where: { id: req.params.id, tenantId }, include: rackInclude });
  if (!rack) return res.status(404).json({ error: 'Rack not found' });
  if (rack.items.some((i) => i.quantity > 0)) {
    return res.status(400).json({ error: 'Cannot delete a rack that still has stock assigned — reassign or clear it first' });
  }

  await prisma.$transaction([
    prisma.warehouseRackItem.deleteMany({ where: { rackId: rack.id } }),
    prisma.warehouseRack.delete({ where: { id: rack.id } }),
  ]);
  res.status(204).end();
});

const assignInput = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().nonnegative(),
});

// Racks track *where* a SKU's existing stock physically sits, not a second
// stock count — the total assigned across every rack for a product is
// guarded against exceeding what Product.stockQty actually says is on hand.
router.post('/racks/:id/assign', requirePermission('inventory:manage'), async (req, res) => {
  const parsed = assignInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { productId, quantity } = parsed.data;

  const tenantId = await resolveTenantId(req);
  const rack = await prisma.warehouseRack.findFirst({ where: { id: req.params.id, tenantId } });
  if (!rack) return res.status(404).json({ error: 'Rack not found' });
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const otherAssignments = await prisma.warehouseRackItem.aggregate({
    where: { productId, tenantId, NOT: { rackId: rack.id } },
    _sum: { quantity: true },
  });
  const alreadyAssignedElsewhere = otherAssignments._sum.quantity ?? 0;
  if (alreadyAssignedElsewhere + quantity > product.stockQty) {
    return res.status(400).json({
      error: `Only ${Math.max(0, product.stockQty - alreadyAssignedElsewhere)} unassigned unit(s) of ${product.name} available to place on a rack`,
    });
  }

  const item = await prisma.warehouseRackItem.upsert({
    where: { rackId_productId: { rackId: rack.id, productId } },
    update: { quantity },
    create: { tenantId, rackId: rack.id, productId, quantity },
    include: { product: { select: { id: true, name: true, sku: true } } },
  });
  res.json(item);
});

// "Where is this SKU physically stored" — the reverse lookup a floor
// associate actually needs, across every warehouse and rack at once.
router.get('/products/:id/rack-locations', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const items = await prisma.warehouseRackItem.findMany({
    where: { productId: req.params.id, tenantId, quantity: { gt: 0 } },
    include: { rack: { include: { warehouse: { select: { id: true, name: true } } } } },
    orderBy: { quantity: 'desc' },
  });
  res.json(
    items.map((i) => ({
      rackId: i.rack.id,
      rackCode: i.rack.code,
      warehouseId: i.rack.warehouse.id,
      warehouseName: i.rack.warehouse.name,
      quantity: i.quantity,
    })),
  );
});

export default router;
