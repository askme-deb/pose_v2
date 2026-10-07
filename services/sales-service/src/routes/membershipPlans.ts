import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const tierValues = ['STANDARD', 'SILVER', 'GOLD', 'VIP_DIAMOND'] as const;

const planInput = z.object({
  name: z.string().min(1),
  tier: z.enum(tierValues),
  annualFee: z.number().nonnegative().optional(),
  discountPercent: z.number().min(0).max(100),
  benefits: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.get('/membership-plans', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const plans = await prisma.membershipPlan.findMany({
    where: { tenantId },
    include: { _count: { select: { customers: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(plans);
});

router.post('/membership-plans', requirePermission('customer:manage'), async (req, res) => {
  const parsed = planInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const duplicate = await prisma.membershipPlan.findFirst({ where: { tenantId, name: parsed.data.name } });
  if (duplicate) return res.status(409).json({ error: 'A plan with this name already exists' });

  const plan = await prisma.membershipPlan.create({ data: { ...parsed.data, tenantId } });
  res.status(201).json(plan);
});

router.put('/membership-plans/:id', requirePermission('customer:manage'), async (req, res) => {
  const parsed = planInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const existing = await prisma.membershipPlan.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Membership plan not found' });

  const plan = await prisma.membershipPlan.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(plan);
});

// Refuse to delete a plan that customers are actively enrolled in — deleting
// it out from under them would silently strip their earned discount at
// checkout with no trace of why.
router.delete('/membership-plans/:id', requirePermission('customer:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const existing = await prisma.membershipPlan.findFirst({
    where: { id: req.params.id, tenantId },
    include: { _count: { select: { customers: true } } },
  });
  if (!existing) return res.status(404).json({ error: 'Membership plan not found' });
  if (existing._count.customers > 0) {
    return res.status(400).json({
      error: `Cannot delete — ${existing._count.customers} customer(s) are still enrolled in this plan`,
    });
  }

  await prisma.membershipPlan.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
