import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';

const router = Router();

const PLAN_PRICING: Record<string, number> = {
  STARTER: 14999,
  PROFESSIONAL: 49999,
  ENTERPRISE: 149999,
};

const tenantInput = z.object({
  organizationName: z.string().min(1),
  subdomain: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Subdomain may only contain lowercase letters, numbers, and hyphens'),
  ownerName: z.string().min(1),
  ownerEmail: z.string().email(),
  plan: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
  storesLimit: z.number().int().positive().optional(),
  storageLimitGB: z.number().int().positive().optional(),
  region: z.enum(['MUMBAI', 'VIRGINIA', 'FRANKFURT']).optional(),
  dbStrategy: z.enum(['dedicated', 'shared']).optional(),
});

function withComputed<T extends { plan: string; _count: { stores: number } }>(t: T) {
  const { _count, ...rest } = t;
  return { ...rest, storesUsed: _count.stores, monthlyBilling: PLAN_PRICING[t.plan] ?? 0 };
}

router.get('/tenants', async (_req, res) => {
  const tenants = await prisma.tenant.findMany({
    include: { _count: { select: { stores: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tenants.map(withComputed));
});

router.post('/tenants', async (req, res) => {
  const parsed = tenantInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { organizationName, subdomain, ownerName, ownerEmail, plan, storesLimit, storageLimitGB, region, dbStrategy } = parsed.data;
  const actor = (req.body.actorName as string) || 'Super Administrator';

  const existing = await prisma.tenant.findUnique({ where: { slug: subdomain } });
  if (existing) return res.status(409).json({ error: 'A tenant with this subdomain already exists' });

  const tenant = await prisma.tenant.create({
    data: {
      name: organizationName,
      slug: subdomain,
      ownerName,
      ownerEmail,
      plan,
      status: 'ACTIVE',
      storesLimit: storesLimit ?? 10,
      storageUsedGB: 5,
      storageLimitGB: storageLimitGB ?? 250,
      region: region ?? 'MUMBAI',
      dbInstancePod: dbStrategy === 'shared' ? `pg-shared-schema-${subdomain}` : `pg-pod-${subdomain}-01`,
    },
    include: { _count: { select: { stores: true } } },
  });
  await logAudit(tenant.id, actor, 'TENANT_PROVISIONED', `Provisioned tenant ${tenant.name} (${tenant.slug}.apexpos.com)`, 'MEDIUM', req.ip);
  res.status(201).json(withComputed(tenant));
});

router.put('/tenants/:id', async (req, res) => {
  const parsed = tenantInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const actor = (req.body.actorName as string) || 'Super Administrator';

  const existing = await prisma.tenant.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Tenant not found' });

  const { organizationName, subdomain, ownerName, ownerEmail, plan, storesLimit, storageLimitGB, region, dbStrategy } = parsed.data;
  const planChanged = plan && plan !== existing.plan;

  const tenant = await prisma.tenant.update({
    where: { id: req.params.id },
    data: {
      name: organizationName,
      slug: subdomain,
      ownerName,
      ownerEmail,
      plan,
      storesLimit,
      storageLimitGB,
      region,
      dbInstancePod:
        dbStrategy && subdomain
          ? dbStrategy === 'shared'
            ? `pg-shared-schema-${subdomain}`
            : `pg-pod-${subdomain}-01`
          : undefined,
    },
    include: { _count: { select: { stores: true } } },
  });

  if (planChanged) {
    await logAudit(tenant.id, actor, 'PLAN_UPGRADE', `Changed ${tenant.name} plan from ${existing.plan} to ${plan}`, 'MEDIUM', req.ip);
  } else {
    await logAudit(tenant.id, actor, 'TENANT_UPDATED', `Updated tenant record for ${tenant.name}`, 'LOW', req.ip);
  }
  res.json(withComputed(tenant));
});

router.post('/tenants/:id/toggle-status', async (req, res) => {
  const actor = (req.body.actorName as string) || 'Super Administrator';
  const existing = await prisma.tenant.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Tenant not found' });

  const nextStatus = existing.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
  const tenant = await prisma.tenant.update({
    where: { id: req.params.id },
    data: { status: nextStatus },
    include: { _count: { select: { stores: true } } },
  });
  await logAudit(tenant.id, actor, 'STATUS_CHANGED', `Set ${tenant.name} status to ${nextStatus}`, 'HIGH', req.ip);
  res.json(withComputed(tenant));
});

const brandingInput = z.object({
  appTitle: z.string().optional(),
  faviconUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  accentColor: z.string().optional(),
  fontFamily: z.string().optional(),
  customCss: z.string().optional(),
  smtpFromLabel: z.string().optional(),
  smtpHost: z.string().optional(),
});

router.get('/tenants/:id/branding', async (req, res) => {
  const branding = await prisma.tenantBranding.findUnique({ where: { tenantId: req.params.id } });
  res.json(branding);
});

router.put('/tenants/:id/branding', async (req, res) => {
  const parsed = brandingInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const actor = (req.body.actorName as string) || 'Super Administrator';

  const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const branding = await prisma.tenantBranding.upsert({
    where: { tenantId: req.params.id },
    update: parsed.data,
    create: { tenantId: req.params.id, ...parsed.data },
  });
  await logAudit(tenant.id, actor, 'BRANDING_UPDATED', `Updated white-label branding config for ${tenant.name}`, 'LOW', req.ip);
  res.json(branding);
});

export default router;
