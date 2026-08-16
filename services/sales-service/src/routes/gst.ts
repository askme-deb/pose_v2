import { Router } from 'express';
import { z } from 'zod';
import { prisma, resolveTenantId } from '../lib/prisma';

const router = Router();

const gstReturnInput = z.object({
  formType: z.enum(['GSTR1', 'GSTR3B']),
  periodMonth: z.string(), // yyyy-MM, first-of-month semantics
  billedTurnover: z.number().nonnegative(),
  taxLiability: z.number().nonnegative(),
  arn: z.string().optional(),
});

function randomARN(): string {
  return `AA270826${Math.floor(100000 + Math.random() * 900000)}`;
}

router.get('/gst-returns', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const returns = await prisma.gstReturn.findMany({ where: { tenantId }, orderBy: { periodMonth: 'desc' } });
  res.json(returns);
});

router.post('/gst-returns', async (req, res) => {
  const parsed = gstReturnInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const { formType, periodMonth, billedTurnover, taxLiability, arn } = parsed.data;

  const gstReturn = await prisma.gstReturn.create({
    data: {
      tenantId,
      formType,
      periodMonth: new Date(`${periodMonth}-01`),
      billedTurnover,
      taxLiability,
      arn: arn || randomARN(),
      status: 'FILED',
    },
  });
  res.status(201).json(gstReturn);
});

router.post('/gst-returns/:id/file', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const existing = await prisma.gstReturn.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'GST return not found' });

  const gstReturn = await prisma.gstReturn.update({
    where: { id: req.params.id },
    data: { status: 'FILED', arn: existing.arn || randomARN() },
  });
  res.json(gstReturn);
});

// Tax slabs and ITC are computed live from the real ledger rather than stored:
// slabs come from actual PAID invoice line items grouped by GST rate, and ITC
// comes from RECEIVED purchase orders' line items (goods actually received,
// valued at the product's GST rate — POs don't track tax separately). This
// reaches into purchase-service's tables directly; services share one Postgres
// database in this scaffold, so that's a pragmatic read across the domain
// boundary rather than a real service-to-service call.
router.get('/gst-summary', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);

  const invoiceItems = await prisma.invoiceItem.findMany({
    where: { invoice: { status: 'PAID', store: { tenantId } } },
    select: { quantity: true, price: true, gstRate: true, productId: true },
  });

  const slabMap = new Map<number, { taxableAmount: number; productIds: Set<string> }>();
  for (const item of invoiceItems) {
    const rate = Number(item.gstRate);
    const taxable = item.quantity * Number(item.price);
    const bucket = slabMap.get(rate) ?? { taxableAmount: 0, productIds: new Set<string>() };
    bucket.taxableAmount += taxable;
    bucket.productIds.add(item.productId);
    slabMap.set(rate, bucket);
  }

  const taxSlabs = [...slabMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, { taxableAmount, productIds }]) => {
      const cgst = Math.round(((taxableAmount * rate) / 2 / 100) * 100) / 100;
      const sgst = cgst;
      return { rate, taxableAmount: Math.round(taxableAmount * 100) / 100, cgst, sgst, total: Math.round((cgst + sgst) * 100) / 100, skuCount: productIds.size };
    });

  const receivedPoItems = await prisma.purchaseOrderItem.findMany({
    where: { purchaseOrder: { orderStatus: 'RECEIVED', tenantId } },
    select: { qty: true, unitPrice: true, product: { select: { gstRate: true } } },
  });
  const itcCredit =
    Math.round(receivedPoItems.reduce((sum, i) => sum + i.qty * Number(i.unitPrice) * (Number(i.product.gstRate) / 100), 0) * 100) / 100;

  res.json({ taxSlabs, itcCredit });
});

export default router;
