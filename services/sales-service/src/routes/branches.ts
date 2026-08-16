import { Router } from 'express';
import { z } from 'zod';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const branchInput = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  type: z.enum(['FLAGSHIP', 'EXPRESS', 'CENTRAL_WAREHOUSE']).optional(),
  manager: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  printers: z.number().int().nonnegative().optional(),
});

router.get('/branches', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const branches = await prisma.store.findMany({ where: { tenantId }, orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] });
  res.json(branches);
});

router.post('/branches', async (req, res) => {
  const parsed = branchInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const branch = await prisma.store.create({ data: { ...parsed.data, tenantId } });
  res.status(201).json(branch);
});

router.put('/branches/:id', async (req, res) => {
  const parsed = branchInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.store.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Branch not found' });

  const branch = await prisma.store.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(branch);
});

export default router;
