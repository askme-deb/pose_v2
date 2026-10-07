import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const include = { componentProduct: { select: { id: true, name: true, sku: true, price: true } } } as const;

router.get('/products/:id/bundle-items', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const items = await prisma.productBundleItem.findMany({ where: { bundleProductId: req.params.id, tenantId }, include });
  res.json(items);
});

const setBundleInput = z.object({
  items: z.array(z.object({ componentProductId: z.string().min(1), quantity: z.number().int().positive() })).min(1),
});

// Replaces the whole composition in one call rather than incremental
// add/remove — a bundle's contents are edited as a set, same as a line-item
// form anywhere else in this app. Setting a composition is what makes a
// product a bundle; clearing it (DELETE below) is what un-makes one.
router.put('/products/:id/bundle-items', requirePermission('inventory:manage'), async (req, res) => {
  const parsed = setBundleInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const bundle = await prisma.product.findFirst({ where: { id: req.params.id, tenantId } });
  if (!bundle) return res.status(404).json({ error: 'Product not found' });

  const componentIds = parsed.data.items.map((i) => i.componentProductId);
  if (componentIds.includes(bundle.id)) return res.status(400).json({ error: 'A bundle cannot contain itself' });
  const components = await prisma.product.findMany({ where: { id: { in: componentIds }, tenantId } });
  if (components.length !== new Set(componentIds).size) return res.status(404).json({ error: 'One or more component products not found' });

  await prisma.$transaction([
    prisma.productBundleItem.deleteMany({ where: { bundleProductId: bundle.id } }),
    prisma.productBundleItem.createMany({
      data: parsed.data.items.map((i) => ({ tenantId, bundleProductId: bundle.id, componentProductId: i.componentProductId, quantity: i.quantity })),
    }),
    prisma.product.update({ where: { id: bundle.id }, data: { isBundle: true } }),
  ]);

  const items = await prisma.productBundleItem.findMany({ where: { bundleProductId: bundle.id }, include });
  res.status(201).json(items);
});

router.delete('/products/:id/bundle-items', requirePermission('inventory:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const bundle = await prisma.product.findFirst({ where: { id: req.params.id, tenantId } });
  if (!bundle) return res.status(404).json({ error: 'Product not found' });

  await prisma.$transaction([
    prisma.productBundleItem.deleteMany({ where: { bundleProductId: bundle.id } }),
    prisma.product.update({ where: { id: bundle.id }, data: { isBundle: false } }),
  ]);
  res.status(204).end();
});

export default router;
