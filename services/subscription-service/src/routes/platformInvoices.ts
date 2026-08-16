import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/platform-invoices', async (_req, res) => {
  const invoices = await prisma.platformInvoice.findMany({
    include: { tenant: { select: { id: true, name: true } } },
    orderBy: { issuedAt: 'desc' },
  });
  res.json(invoices);
});

export default router;
