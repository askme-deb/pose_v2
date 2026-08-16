import { Router } from 'express';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

router.get('/audit-logs', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const logs = await prisma.auditLog.findMany({ where: { tenantId }, orderBy: { timestamp: 'desc' }, take: 200 });
  res.json(logs);
});

export default router;
