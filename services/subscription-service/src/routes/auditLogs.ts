import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Platform-wide, cross-tenant view of the audit trail — unlike the
// authentication service's /audit-logs (scoped to a single resolved tenant),
// superadmin needs visibility across every tenant's provisioning/billing events.
router.get('/audit-logs', async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    include: { tenant: { select: { id: true, name: true } } },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });
  res.json(logs);
});

export default router;
