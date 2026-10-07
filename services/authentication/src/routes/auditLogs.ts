import { Router } from 'express';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

router.get('/audit-logs', requirePermission('report:view'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const logs = await prisma.auditLog.findMany({ where: { tenantId }, orderBy: { timestamp: 'desc' }, take: 200 });
  res.json(logs);
});

export default router;
