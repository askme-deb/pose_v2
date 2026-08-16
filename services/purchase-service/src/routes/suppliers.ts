import { Router } from 'express';
import { z } from 'zod';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const supplierInput = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  gstin: z.string().optional(),
});

// totalOrders/outstandingAmount are computed live from real POs rather than
// stored, same reasoning as customer LTV / category skuCount elsewhere.
// Outstanding balance has no per-payment ledger yet, so PARTIAL orders are
// approximated at half their total still owed — a documented simplification,
// not a real payments reconciliation.
async function withStats<T extends { id: string }>(suppliers: T[]) {
  const orders = await Promise.all(
    suppliers.map((s) => prisma.purchaseOrder.findMany({ where: { supplierId: s.id }, select: { totalAmount: true, paymentStatus: true } })),
  );
  return suppliers.map((s, i) => {
    const supplierOrders = orders[i];
    const outstandingAmount = supplierOrders.reduce((sum, po) => {
      if (po.paymentStatus === 'UNPAID') return sum + Number(po.totalAmount);
      if (po.paymentStatus === 'PARTIAL') return sum + Number(po.totalAmount) / 2;
      return sum;
    }, 0);
    return { ...s, totalOrders: supplierOrders.length, outstandingAmount };
  });
}

router.get('/suppliers', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const suppliers = await prisma.supplier.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  res.json(await withStats(suppliers));
});

router.post('/suppliers', async (req, res) => {
  const parsed = supplierInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const supplier = await prisma.supplier.create({ data: { ...parsed.data, tenantId } });
  const [withStatsResult] = await withStats([supplier]);
  res.status(201).json(withStatsResult);
});

export default router;
