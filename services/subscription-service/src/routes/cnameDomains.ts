import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';

const router = Router();

const domainInput = z.object({
  tenantId: z.string().min(1),
  cnameDomain: z.string().min(1),
});

router.get('/cname-domains', async (_req, res) => {
  const domains = await prisma.cnameDomain.findMany({
    include: { tenant: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(domains);
});

router.post('/cname-domains', async (req, res) => {
  const parsed = domainInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const actor = (req.body.actorName as string) || 'Super Administrator';

  const tenant = await prisma.tenant.findUnique({ where: { id: parsed.data.tenantId } });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const existing = await prisma.cnameDomain.findUnique({ where: { cnameDomain: parsed.data.cnameDomain } });
  if (existing) return res.status(409).json({ error: 'This CNAME domain is already bound' });

  const domain = await prisma.cnameDomain.create({
    data: { tenantId: parsed.data.tenantId, cnameDomain: parsed.data.cnameDomain },
    include: { tenant: { select: { id: true, name: true } } },
  });
  await logAudit(tenant.id, actor, 'DOMAIN_BOUND', `Bound custom CNAME domain ${domain.cnameDomain} with Let's Encrypt SSL`, 'MEDIUM', req.ip);
  res.status(201).json(domain);
});

export default router;
