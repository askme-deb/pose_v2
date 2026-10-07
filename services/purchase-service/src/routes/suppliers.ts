import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const supplierInput = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  gstin: z.string().optional(),
});

// totalOrders/outstandingAmount are computed live rather than stored, same
// reasoning as customer LTV / category skuCount elsewhere. Outstanding is a
// real ledger balance now — every PO owed in full at creation, reduced by
// actual SupplierPayment rows and by the value of any issued PurchaseReturn —
// not the old "PARTIAL = half owed" approximation.
async function withStats<T extends { id: string }>(suppliers: T[]) {
  const [orders, payments, returns] = await Promise.all([
    Promise.all(suppliers.map((s) => prisma.purchaseOrder.findMany({ where: { supplierId: s.id }, select: { totalAmount: true } }))),
    Promise.all(suppliers.map((s) => prisma.supplierPayment.aggregate({ where: { supplierId: s.id }, _sum: { amount: true } }))),
    Promise.all(suppliers.map((s) => prisma.purchaseReturn.aggregate({ where: { supplierId: s.id, status: 'ISSUED' }, _sum: { totalValue: true } }))),
  ]);
  return suppliers.map((s, i) => {
    const owed = orders[i].reduce((sum, po) => sum + Number(po.totalAmount), 0);
    const paid = Number(payments[i]._sum.amount ?? 0);
    const returned = Number(returns[i]._sum.totalValue ?? 0);
    return { ...s, totalOrders: orders[i].length, outstandingAmount: Math.max(0, owed - paid - returned) };
  });
}

router.get('/suppliers', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const suppliers = await prisma.supplier.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  res.json(await withStats(suppliers));
});

router.post('/suppliers', requirePermission('purchase:manage'), async (req, res) => {
  const parsed = supplierInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const supplier = await prisma.supplier.create({ data: { ...parsed.data, tenantId } });
  const [withStatsResult] = await withStats([supplier]);
  res.status(201).json(withStatsResult);
});

const paymentInput = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE']).default('BANK_TRANSFER'),
  purchaseOrderId: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/suppliers/:id/payments', requirePermission('purchase:manage'), async (req, res) => {
  const parsed = paymentInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const supplier = await prisma.supplier.findFirst({ where: { id: req.params.id, tenantId } });
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  const payment = await prisma.supplierPayment.create({
    data: { tenantId, supplierId: supplier.id, ...parsed.data },
  });
  res.status(201).json(payment);
});

// A single chronological trail of everything that moved this supplier's
// balance — replaces having to mentally reconcile POs, payments, and returns
// separately. Each entry carries a signed amount; the running balance is what
// withStats' outstandingAmount already reports as of "now".
router.get('/suppliers/:id/ledger', requirePermission('report:view'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const supplier = await prisma.supplier.findFirst({ where: { id: req.params.id, tenantId } });
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  const [orders, payments, returns] = await Promise.all([
    prisma.purchaseOrder.findMany({ where: { supplierId: supplier.id }, select: { id: true, poNumber: true, totalAmount: true, createdAt: true } }),
    prisma.supplierPayment.findMany({ where: { supplierId: supplier.id }, orderBy: { paidAt: 'asc' } }),
    prisma.purchaseReturn.findMany({ where: { supplierId: supplier.id, status: 'ISSUED' }, select: { id: true, returnNumber: true, totalValue: true, createdAt: true } }),
  ]);

  const entries = [
    ...orders.map((po) => ({ type: 'PURCHASE_ORDER' as const, id: po.id, label: po.poNumber, amount: Number(po.totalAmount), date: po.createdAt })),
    ...payments.map((p) => ({ type: 'PAYMENT' as const, id: p.id, label: p.reference ?? p.method, amount: -Number(p.amount), date: p.paidAt })),
    ...returns.map((r) => ({ type: 'RETURN' as const, id: r.id, label: r.returnNumber, amount: -Number(r.totalValue), date: r.createdAt })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  const ledger = entries.map((e) => {
    running += e.amount;
    return { ...e, balance: running };
  });

  res.json({ supplier: { id: supplier.id, name: supplier.name }, entries: ledger, currentBalance: running });
});

export default router;
