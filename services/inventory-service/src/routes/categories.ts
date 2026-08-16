import { Router } from 'express';
import { z } from 'zod';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const categoryInput = z.object({
  name: z.string().min(1),
});

router.get('/categories', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const categories = await prisma.category.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
  res.json(categories);
});

router.post('/categories', async (req, res) => {
  const parsed = categoryInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const category = await prisma.category.create({ data: { ...parsed.data, tenantId } });
  res.status(201).json(category);
});

export default router;
