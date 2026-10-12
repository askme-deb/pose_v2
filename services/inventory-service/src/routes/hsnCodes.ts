import { Router } from 'express';
import { z } from 'zod';
import { HttpError, requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const hsnInput = z.object({
  // HSN (goods) is 2–8 digits, SAC (services) 6; both are plain digit strings.
  code: z.string().trim().regex(/^\d{2,8}$/, 'HSN / SAC code must be 2 to 8 digits'),
  description: z.string().trim().min(1, 'Add a short description').max(200),
  gstRate: z.number().min(0).max(100),
  isActive: z.boolean().optional(),
});

/** Each code with how many products currently use it. */
async function withUsage<T extends { code: string }>(tenantId: string, rows: T[]) {
  const usage = await prisma.product.groupBy({ by: ['hsnCode'], where: { tenantId, hsnCode: { in: rows.map((r) => r.code) } }, _count: true });
  const counts = new Map(usage.map((u) => [u.hsnCode, u._count]));
  return rows.map((r) => ({ ...r, productCount: counts.get(r.code) ?? 0 }));
}

router.get('/hsn-codes', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const rows = await prisma.hsnCode.findMany({ where: { tenantId }, orderBy: { code: 'asc' } });
  res.json(await withUsage(tenantId, rows));
});

router.get('/hsn-codes/:id', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const row = await prisma.hsnCode.findFirst({ where: { id: req.params.id, tenantId } });
  if (!row) return res.status(404).json({ error: 'HSN code not found' });
  res.json((await withUsage(tenantId, [row]))[0]);
});

router.post('/hsn-codes', requirePermission('inventory:manage'), async (req, res) => {
  const parsed = hsnInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const tenantId = await resolveTenantId(req);
  const exists = await prisma.hsnCode.findUnique({ where: { tenantId_code: { tenantId, code: parsed.data.code } } });
  if (exists) throw new HttpError(409, `HSN code ${parsed.data.code} already exists`);
  const row = await prisma.hsnCode.create({ data: { ...parsed.data, tenantId } });
  res.status(201).json((await withUsage(tenantId, [row]))[0]);
});

// The rate lives here, so changing it (or the code) carries through to every
// product that uses the code. Invoices already issued keep the rate they were
// issued at: they store their own copy.
router.put('/hsn-codes/:id', requirePermission('inventory:manage'), async (req, res) => {
  const parsed = hsnInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const tenantId = await resolveTenantId(req);
  const existing = await prisma.hsnCode.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'HSN code not found' });

  if (parsed.data.code && parsed.data.code !== existing.code) {
    const clash = await prisma.hsnCode.findUnique({ where: { tenantId_code: { tenantId, code: parsed.data.code } } });
    if (clash) throw new HttpError(409, `HSN code ${parsed.data.code} already exists`);
  }

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.hsnCode.update({ where: { id: existing.id }, data: parsed.data });
    const codeChanged = updated.code !== existing.code;
    const rateChanged = Number(updated.gstRate) !== Number(existing.gstRate);
    if (codeChanged || rateChanged) {
      await tx.product.updateMany({
        where: { tenantId, hsnCode: existing.code },
        data: { hsnCode: updated.code, gstRate: updated.gstRate },
      });
    }
    return updated;
  });
  res.json((await withUsage(tenantId, [row]))[0]);
});

router.delete('/hsn-codes/:id', requirePermission('inventory:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const existing = await prisma.hsnCode.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'HSN code not found' });
  const inUse = await prisma.product.count({ where: { tenantId, hsnCode: existing.code } });
  if (inUse > 0) {
    throw new HttpError(409, `${inUse} product${inUse === 1 ? ' uses' : 's use'} HSN ${existing.code}. Move them to another code first, or mark this one inactive.`);
  }
  await prisma.hsnCode.delete({ where: { id: existing.id } });
  res.status(204).end();
});

export default router;
