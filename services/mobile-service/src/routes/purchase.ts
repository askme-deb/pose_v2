import { Router } from 'express';
import { z } from 'zod';
import { requirePermission, HttpError, tenantIdOf } from '@pospe/permissions';
import { prisma, ctxOf } from '../lib/prisma';
import { round2 } from '../lib/util';

const router = Router();

router.get('/get-sellers', async (req, res) => {
  const tenantId = tenantIdOf(req);
  const suppliers = await prisma.supplier.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  res.json({ sellers: suppliers.map((s) => ({ id: s.id, seller_name: s.name })) });
});

const idish = z.union([z.string(), z.number()]).transform(String);
const numish = z.union([z.number(), z.string()]).transform(Number);

// The app's field names are misspelled (`veriation_option_id`, `expriay_date`);
// they are accepted exactly as sent (contract §8.3).
const purchaseInput = z.object({
  seller_id: idish,
  invoice_no: z.string().trim().min(1),
  products: z
    .array(
      z.object({
        product_id: idish,
        veriation_option_id: idish.optional(),
        quantity: numish.refine((n) => Number.isInteger(n) && n > 0, 'quantity must be a whole number above 0'),
        mrp: numish.optional().default(0),
        batch_no: z.string().trim().optional().default(''),
        expriay_date: z.string().trim().optional().default(''),
        discount_rate: z.union([z.number(), z.string()]).optional().default(''),
      }),
    )
    .min(1),
});

// Direct stock-in (no purchase order behind it): raises stock, records a
// batch when the app supplied one, and leaves an approved adjustment so the
// movement shows up in stock history.
router.post('/purchase-store', requirePermission('purchase:manage'), async (req, res) => {
  const body = purchaseInput.parse(req.body);
  const ctx = await ctxOf(req);
  const store = await prisma.store.findUniqueOrThrow({ where: { id: ctx.storeId } });
  if (!store.purchaseEnabled) throw new HttpError(403, 'Purchasing is not enabled for this branch');
  const seller = await prisma.supplier.findFirst({ where: { id: body.seller_id, tenantId: ctx.tenantId } });
  if (!seller) throw new HttpError(404, 'Seller not found');
  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true } });

  const ids = [...new Set(body.products.map((p) => p.product_id))];
  const products = await prisma.product.findMany({ where: { id: { in: ids }, tenantId: ctx.tenantId } });
  if (products.length !== ids.length) throw new HttpError(404, 'One or more products not found');
  const byId = new Map(products.map((p) => [p.id, p]));

  await prisma.$transaction(async (tx) => {
    for (const line of body.products) {
      const product = byId.get(line.product_id)!;
      const discount = Math.min(Math.max(Number(line.discount_rate) || 0, 0), 100);
      const cost = round2(line.mrp * (1 - discount / 100));
      await tx.product.update({
        where: { id: product.id },
        data: { stockQty: { increment: line.quantity }, ...(line.mrp > 0 ? { mrp: line.mrp } : {}), ...(cost > 0 ? { costPrice: cost } : {}) },
      });
      if (line.batch_no) {
        const expiry = line.expriay_date ? new Date(line.expriay_date) : null;
        if (expiry && Number.isNaN(expiry.getTime())) throw new HttpError(400, `Invalid expiry date for ${product.name}`);
        await tx.productBatch.upsert({
          where: { tenantId_productId_batchNumber: { tenantId: ctx.tenantId, productId: product.id, batchNumber: line.batch_no } },
          create: { tenantId: ctx.tenantId, productId: product.id, batchNumber: line.batch_no, quantity: line.quantity, costPrice: cost, expiryDate: expiry },
          update: { quantity: { increment: line.quantity }, costPrice: cost, ...(expiry ? { expiryDate: expiry } : {}) },
        });
      }
      await tx.stockAdjustment.create({
        data: {
          tenantId: ctx.tenantId,
          productId: product.id,
          action: 'ADD',
          qty: line.quantity,
          reasonCode: `PURCHASE ${body.invoice_no} (${seller.name})`.slice(0, 120),
          auditor: user?.name ?? 'Mobile app',
          valueImpact: round2(cost * line.quantity),
          status: 'APPROVED',
        },
      });
    }
  });

  res.status(201).json({ message: 'Purchase saved' });
});

export default router;
