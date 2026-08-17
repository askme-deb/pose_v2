import { Router } from 'express';
import { z } from 'zod';
import { prisma, resolveTenantId } from '../lib/prisma';
import { indexCustomer, deleteCustomerFromIndex } from '../lib/elasticsearch';

const router = Router();

const tierValues = ['STANDARD', 'SILVER', 'GOLD', 'VIP_DIAMOND'] as const;

const customerInput = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  tier: z.enum(tierValues).optional(),
  loyaltyPoints: z.number().int().nonnegative().optional(),
});

// Lifetime spend / order count / last visit are computed live from PAID invoices
// rather than stored — they'd drift out of sync with the real ledger otherwise,
// and sales-service already owns Invoice.
async function withStats<T extends { id: string }>(customers: T[]) {
  const stats = await Promise.all(
    customers.map((c) =>
      prisma.invoice.aggregate({
        where: { customerId: c.id, status: 'PAID' },
        _sum: { total: true },
        _count: true,
        _max: { createdAt: true },
      }),
    ),
  );
  return customers.map((c, i) => ({
    ...c,
    lifetimeSpend: Number(stats[i]._sum.total ?? 0),
    ordersCount: stats[i]._count,
    lastVisit: stats[i]._max.createdAt,
  }));
}

router.get('/customers', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const customers = await prisma.customer.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  res.json(await withStats(customers));
});

router.post('/customers', async (req, res) => {
  const parsed = customerInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const customer = await prisma.customer.create({ data: { ...parsed.data, tenantId } });
  indexCustomer(customer);
  const [withStatsResult] = await withStats([customer]);
  res.status(201).json(withStatsResult);
});

router.put('/customers/:id', async (req, res) => {
  const parsed = customerInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  const customer = await prisma.customer.update({ where: { id: req.params.id }, data: parsed.data });
  indexCustomer(customer);
  const [withStatsResult] = await withStats([customer]);
  res.json(withStatsResult);
});

router.delete('/customers/:id', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  // Invoices reference customerId with no cascade — unlink rather than block the
  // delete, since the invoice/receipt history should still exist after this.
  await prisma.$transaction([
    prisma.invoice.updateMany({ where: { customerId: req.params.id }, data: { customerId: null } }),
    prisma.customer.delete({ where: { id: req.params.id } }),
  ]);
  deleteCustomerFromIndex(req.params.id);
  res.status(204).end();
});

const bonusInput = z.object({
  amount: z.number().int().min(1),
  reason: z.string().min(1),
});

router.post('/customers/:id/bonus-points', async (req, res) => {
  const parsed = bonusInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: { loyaltyPoints: { increment: parsed.data.amount } },
  });
  indexCustomer(customer);
  const [withStatsResult] = await withStats([customer]);
  res.json(withStatsResult);
});

export default router;
