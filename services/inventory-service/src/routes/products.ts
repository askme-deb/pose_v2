import { Router } from 'express';
import { z } from 'zod';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const productInput = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  hsnCode: z.string().optional(),
  unit: z.string().optional(),
  mrp: z.number().nonnegative().optional(),
  price: z.number().nonnegative(),
  costPrice: z.number().nonnegative().optional(),
  gstRate: z.number().min(0).max(100).optional(),
  imageUrl: z.string().optional(),
  stockQty: z.number().int().nonnegative().optional(),
  minThreshold: z.number().int().nonnegative().optional(),
});

router.get('/products', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const products = await prisma.product.findMany({
    where: { tenantId },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(products);
});

router.post('/products', async (req, res) => {
  const parsed = productInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const product = await prisma.product.create({
    data: { ...parsed.data, tenantId },
    include: { category: true },
  });
  res.status(201).json(product);
});

router.put('/products/:id', async (req, res) => {
  const parsed = productInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { category: true },
  });
  res.json(product);
});

router.delete('/products/:id', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
