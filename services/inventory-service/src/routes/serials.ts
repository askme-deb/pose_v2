import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const include = {
  product: { select: { id: true, name: true, sku: true } },
} as const;

const serialStatus = z.enum(['IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED']);

router.get('/products/:id/serials', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const statusFilter = serialStatus.safeParse(req.query.status);
  const serials = await prisma.productSerial.findMany({
    where: { productId: req.params.id, tenantId, ...(statusFilter.success ? { status: statusFilter.data } : {}) },
    include,
    orderBy: { createdAt: 'desc' },
  });
  res.json(serials);
});

// Cross-product lookup — "which product/invoice does serial X belong to",
// the question a warranty claim or a customer walk-in actually asks.
router.get('/serials/search', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.json([]);

  const serials = await prisma.productSerial.findMany({
    where: { tenantId, serialNumber: { contains: q, mode: 'insensitive' } },
    include,
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json(serials);
});

// Records which physical unit fulfilled a sale — the sale itself (and its
// stock decrement) already happened through the normal checkout; this is
// traceability, not a second stock movement.
const sellInput = z.object({ invoiceId: z.string().min(1) });

router.post('/serials/:id/sell', requirePermission('inventory:manage'), async (req, res) => {
  const parsed = sellInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const serial = await prisma.productSerial.findFirst({ where: { id: req.params.id, tenantId } });
  if (!serial) return res.status(404).json({ error: 'Serial not found' });
  if (serial.status !== 'IN_STOCK') return res.status(400).json({ error: `Serial is already ${serial.status.toLowerCase()}` });

  // Invoice lives in sales-service's domain but the same shared database —
  // checked explicitly rather than left to surface as an FK violation, which
  // would otherwise crash the whole process (Express 4 doesn't forward an
  // unhandled async rejection to any error middleware on its own).
  const invoice = await prisma.invoice.findUnique({ where: { id: parsed.data.invoiceId } });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const updated = await prisma.productSerial.update({
    where: { id: serial.id },
    data: { status: 'SOLD', invoiceId: parsed.data.invoiceId },
    include,
  });
  res.json(updated);
});

const markInput = z.object({ status: z.enum(['IN_STOCK', 'RETURNED', 'DAMAGED']) });

// Manual status transitions for everything that isn't a fresh sale — a
// warranty return, a unit found damaged on the shelf. No stock movement here
// either: an actual return already restocks the quantity through the normal
// credit-note/refund flow; this just keeps this specific unit's history honest.
router.post('/serials/:id/mark', requirePermission('inventory:manage'), async (req, res) => {
  const parsed = markInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const serial = await prisma.productSerial.findFirst({ where: { id: req.params.id, tenantId } });
  if (!serial) return res.status(404).json({ error: 'Serial not found' });

  const updated = await prisma.productSerial.update({
    where: { id: serial.id },
    data: { status: parsed.data.status },
    include,
  });
  res.json(updated);
});

export default router;
