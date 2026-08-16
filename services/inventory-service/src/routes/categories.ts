import { Router } from 'express';
import { z } from 'zod';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const categoryInput = z.object({
  name: z.string().min(1),
  gstRate: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

router.get('/categories', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const categories = await prisma.category.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json(categories.map(({ _count, ...c }) => ({ ...c, skuCount: _count.products })));
});

router.post('/categories', async (req, res) => {
  const parsed = categoryInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const category = await prisma.category.create({ data: { ...parsed.data, tenantId } });
  res.status(201).json({ ...category, skuCount: 0 });
});

router.put('/categories/:id', async (req, res) => {
  const parsed = categoryInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.category.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { _count: { select: { products: true } } },
  });
  const { _count, ...rest } = category;
  res.json({ ...rest, skuCount: _count.products });
});

export default router;
