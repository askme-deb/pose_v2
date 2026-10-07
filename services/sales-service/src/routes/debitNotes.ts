import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId, resolveStoreId } from '../lib/prisma';

const router = Router();

const createDebitNoteInput = z.object({
  invoiceId: z.string().min(1),
  reason: z.string().min(1),
  amount: z.number().positive(),
});

const include = {
  invoice: { select: { id: true, invoiceNumber: true } },
} as const;

router.get('/debit-notes', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);
  const notes = await prisma.debitNote.findMany({ where: { storeId }, include, orderBy: { createdAt: 'desc' } });
  res.json(notes);
});

// Covers an additional charge billed after the original invoice — a freight
// correction, a shortfall found at delivery. No stock moves for this one, it
// just records an amount owed on top of what was already invoiced.
router.post('/debit-notes', requirePermission('sales:manage'), async (req, res) => {
  const parsed = createDebitNoteInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { invoiceId, reason, amount } = parsed.data;

  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);

  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, storeId } });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const existingCount = await prisma.debitNote.count({ where: { tenantId } });
  const debitNoteNumber = `DN-${7000 + existingCount + 1}`;

  const debitNote = await prisma.debitNote.create({
    data: { tenantId, storeId, debitNoteNumber, invoiceId, customerName: invoice.customerName, reason, amount },
    include,
  });
  res.status(201).json(debitNote);
});

router.post('/debit-notes/:id/cancel', requirePermission('sales:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const existing = await prisma.debitNote.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Debit note not found' });
  if (existing.status === 'CANCELLED') return res.status(400).json({ error: 'Debit note is already cancelled' });

  const updated = await prisma.debitNote.update({ where: { id: existing.id }, data: { status: 'CANCELLED' }, include });
  res.json(updated);
});

export default router;
