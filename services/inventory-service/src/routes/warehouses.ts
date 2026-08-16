import { Router } from 'express';
import { z } from 'zod';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const warehouseInput = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  totalRacks: z.number().int().nonnegative().optional(),
  address: z.string().optional(),
  manager: z.string().optional(),
});

router.get('/warehouses', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const warehouses = await prisma.warehouse.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  res.json(warehouses);
});

router.post('/warehouses', async (req, res) => {
  const parsed = warehouseInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const warehouse = await prisma.warehouse.create({ data: { ...parsed.data, tenantId } });
  res.status(201).json(warehouse);
});

export default router;
