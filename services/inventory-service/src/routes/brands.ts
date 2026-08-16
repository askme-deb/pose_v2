import { Router } from 'express';
import { z } from 'zod';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const brandInput = z.object({
  name: z.string().min(1),
  countryOfOrigin: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
});

router.get('/brands', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const brands = await prisma.brand.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });

  // Brand has no direct product relation (categoryIds is a flat scalar array),
  // so approximate SKU count via products in any of the brand's categories.
  const skuCounts = await Promise.all(
    brands.map((b) =>
      b.categoryIds.length
        ? prisma.product.count({ where: { tenantId, categoryId: { in: b.categoryIds } } })
        : Promise.resolve(0),
    ),
  );

  res.json(brands.map((b, i) => ({ ...b, skuCount: skuCounts[i] })));
});

router.post('/brands', async (req, res) => {
  const parsed = brandInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const brand = await prisma.brand.create({ data: { ...parsed.data, tenantId } });
  res.status(201).json({ ...brand, skuCount: 0 });
});

router.put('/brands/:id', async (req, res) => {
  const parsed = brandInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.brand.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Brand not found' });

  const brand = await prisma.brand.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(brand);
});

export default router;
