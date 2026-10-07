import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
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
  const tenantId = await resolveTenantId(req);
  const branches = await prisma.store.findMany({ where: { tenantId }, orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] });
  res.json(branches);
});

router.post('/branches', requirePermission('store:manage'), async (req, res) => {
  const parsed = branchInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  // Subscription plan limit — set per tenant on the superadmin Tenants page.
  const [tenant, storeCount] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { storesLimit: true, plan: true } }),
    prisma.store.count({ where: { tenantId } }),
  ]);
  if (storeCount >= tenant.storesLimit) {
    return res.status(402).json({
      error: `Your ${tenant.plan} plan allows ${tenant.storesLimit} branch${tenant.storesLimit === 1 ? '' : 'es'}. Upgrade your plan to add more.`,
    });
  }
  const branch = await prisma.store.create({ data: { ...parsed.data, tenantId } });
  res.status(201).json(branch);
});

router.put('/branches/:id', requirePermission('store:manage'), async (req, res) => {
  const parsed = branchInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const existing = await prisma.store.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Branch not found' });

  const branch = await prisma.store.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(branch);
});

export default router;
