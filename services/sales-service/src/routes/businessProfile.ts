import { Router } from 'express';
import { z } from 'zod';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const profileInput = z.object({
  registeredName: z.string().min(1).optional(),
  tagline: z.string().optional(),
  logoUrl: z.string().optional(),
  retailCategory: z.string().optional(),
  cin: z.string().optional(),
  yearEstablished: z.number().int().optional(),
  supportEmail: z.string().optional(),
  helplinePhone: z.string().optional(),
  hqAddress: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  stateCode: z.string().optional(),
  defaultTaxSlab: z.number().int().optional(),
  invoicePrefix: z.string().optional(),
  nextInvoiceNumber: z.number().int().optional(),
  currencySymbol: z.string().optional(),
  financialYearStart: z.string().optional(),
  ewayBillThreshold: z.number().int().optional(),
  receiptHeader: z.string().optional(),
  receiptSubHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
  receiptReturnPolicy: z.string().optional(),
  receiptPaperWidth: z.string().optional(),
  receiptShowUpiQr: z.boolean().optional(),
  razorpayKeyId: z.string().optional(),
  whatsappPhoneId: z.string().optional(),
});

router.get('/business-profile', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const profile = await prisma.tenantProfile.findUnique({ where: { tenantId } });
  if (!profile) return res.status(404).json({ error: 'Business profile not configured for this tenant' });
  res.json(profile);
});

router.put('/business-profile', async (req, res) => {
  const parsed = profileInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const profile = await prisma.tenantProfile.upsert({
    where: { tenantId },
    update: parsed.data,
    create: { tenantId, registeredName: parsed.data.registeredName ?? 'Unnamed Business', ...parsed.data },
  });
  res.json(profile);
});

export default router;
