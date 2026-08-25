import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';
import { indexCustomer, deleteCustomerFromIndex } from '../lib/elasticsearch';
import { runBirthdayOffers } from '../lib/birthdayCron';

const router = Router();

const tierValues = ['STANDARD', 'SILVER', 'GOLD', 'VIP_DIAMOND'] as const;

const customerInput = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  tier: z.enum(tierValues).optional(),
  loyaltyPoints: z.number().int().nonnegative().optional(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  membershipPlanId: z.string().optional().nullable(),
});

// Shared by create/update — a tampered/stale plan id would silently grant no
// discount at checkout rather than failing loudly, so verify it up front.
async function assertMembershipPlan(tenantId: string, membershipPlanId: string | null | undefined) {
  if (!membershipPlanId) return true;
  const plan = await prisma.membershipPlan.findFirst({ where: { id: membershipPlanId, tenantId } });
  return !!plan;
}

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
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    include: { membershipPlan: true },
    orderBy: { name: 'asc' },
  });
  res.json(await withStats(customers));
});

router.post('/customers', requirePermission('customer:manage'), async (req, res) => {
  const parsed = customerInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  if (!(await assertMembershipPlan(tenantId, parsed.data.membershipPlanId))) {
    return res.status(404).json({ error: 'Membership plan not found' });
  }
  const customer = await prisma.customer.create({
    data: { ...parsed.data, tenantId },
    include: { membershipPlan: true },
  });
  indexCustomer(customer);
  const [withStatsResult] = await withStats([customer]);
  res.status(201).json(withStatsResult);
});

router.put('/customers/:id', requirePermission('customer:manage'), async (req, res) => {
  const parsed = customerInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Customer not found' });
  if (!(await assertMembershipPlan(tenantId, parsed.data.membershipPlanId))) {
    return res.status(404).json({ error: 'Membership plan not found' });
  }

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { membershipPlan: true },
  });
  indexCustomer(customer);
  const [withStatsResult] = await withStats([customer]);
  res.json(withStatsResult);
});

router.delete('/customers/:id', requirePermission('customer:manage'), async (req, res) => {
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

router.post('/customers/:id/bonus-points', requirePermission('customer:manage'), async (req, res) => {
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

// ---------- Wallet ----------

const walletTopupInput = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
});

router.post('/customers/:id/wallet/topup', requirePermission('customer:manage'), async (req, res) => {
  const parsed = walletTopupInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  const [, customer] = await prisma.$transaction([
    prisma.customerWalletTransaction.create({
      data: { tenantId, customerId: existing.id, type: 'TOP_UP', amount: parsed.data.amount, note: parsed.data.note },
    }),
    prisma.customer.update({
      where: { id: existing.id },
      data: { walletBalance: { increment: parsed.data.amount } },
      include: { membershipPlan: true },
    }),
  ]);
  res.status(201).json(customer);
});

const walletRedeemInput = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
  invoiceId: z.string().optional(),
});

// A real guard, not cosmetic — a tampered request asking to redeem more than
// the ledger total would otherwise push walletBalance negative.
router.post('/customers/:id/wallet/redeem', requirePermission('customer:manage'), async (req, res) => {
  const parsed = walletRedeemInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Customer not found' });
  if (Number(existing.walletBalance) < parsed.data.amount) {
    return res.status(400).json({ error: `Insufficient wallet balance — available ₹${existing.walletBalance}` });
  }
  if (parsed.data.invoiceId) {
    const invoice = await prisma.invoice.findFirst({ where: { id: parsed.data.invoiceId, customerId: existing.id } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found for this customer' });
  }

  const [, customer] = await prisma.$transaction([
    prisma.customerWalletTransaction.create({
      data: {
        tenantId,
        customerId: existing.id,
        type: 'REDEEM',
        amount: parsed.data.amount,
        note: parsed.data.note,
        invoiceId: parsed.data.invoiceId,
      },
    }),
    prisma.customer.update({
      where: { id: existing.id },
      data: { walletBalance: { decrement: parsed.data.amount } },
      include: { membershipPlan: true },
    }),
  ]);
  res.json(customer);
});

router.get('/customers/:id/wallet/transactions', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  const transactions = await prisma.customerWalletTransaction.findMany({
    where: { customerId: existing.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(transactions);
});

// Lets an admin force the daily birthday job to run now instead of waiting
// for the 9am schedule — this is how the automation gets verified end-to-end
// without waiting for an actual birthday, and it's a legitimate ops action
// (e.g. re-running after a deploy that missed the scheduled window).
router.post('/customers/birthday-offers/run', requirePermission('customer:manage'), async (_req, res) => {
  const result = await runBirthdayOffers();
  res.json(result);
});

export default router;
