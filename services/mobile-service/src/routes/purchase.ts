import { Router, type Request } from 'express';
import { z } from 'zod';
import { requirePermission, HttpError, tenantIdOf } from '@pospe/permissions';
import { prisma, ctxOf } from '../lib/prisma';
import { round2, ymd } from '../lib/util';

const router = Router();
const PURCHASE_SERVICE_URL = () => process.env.PURCHASE_SERVICE_URL || 'http://localhost:4004';

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

/** Calls purchase-service as the signed-in user, so its own permission checks and numbering apply. */
async function callPurchase<T>(req: Request, path: string, body: unknown): Promise<T> {
  const response = await fetch(`${PURCHASE_SERVICE_URL()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: req.header('authorization') ?? '' },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: unknown };
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : 'Purchase could not be saved';
    throw new HttpError([400, 403, 404, 409].includes(response.status) ? response.status : 502, message);
  }
  return data as T;
}

// A stock-in from the app is a real purchase: it becomes a purchase order
// plus a goods-received note in purchase-service, so it shows up in the web
// portal's Purchase section, moves the supplier's balance, and raises stock
// (per option for products with variations) through the one receiving path
// the web uses.
router.post('/purchase-store', requirePermission('purchase:manage'), async (req, res) => {
  const body = purchaseInput.parse(req.body);
  const ctx = await ctxOf(req);
  const store = await prisma.store.findUniqueOrThrow({ where: { id: ctx.storeId } });
  if (!store.purchaseEnabled) throw new HttpError(403, 'Purchasing is not enabled for this branch');
  const seller = await prisma.supplier.findFirst({ where: { id: body.seller_id, tenantId: ctx.tenantId } });
  if (!seller) throw new HttpError(404, 'Seller not found');
  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true } });

  const ids = [...new Set(body.products.map((p) => p.product_id))];
  const products = await prisma.product.findMany({ where: { id: { in: ids }, tenantId: ctx.tenantId }, include: { options: true } });
  if (products.length !== ids.length) throw new HttpError(404, 'One or more products not found');
  const byId = new Map(products.map((p) => [p.id, p]));

  // One resolved line per app row: product, option (if any), unit cost, receipt details.
  const rows = body.products.map((line) => {
    const product = byId.get(line.product_id)!;
    const wanted = line.veriation_option_id && line.veriation_option_id !== product.id ? line.veriation_option_id : null;
    const option = product.options.length ? product.options.find((o) => o.id === wanted) ?? null : null;
    if (product.options.length && !option) throw new HttpError(400, `Choose a ${(product.variationName ?? 'variation').toLowerCase()} for ${product.name}`);
    const discount = Math.min(Math.max(Number(line.discount_rate) || 0, 0), 100);
    const typed = round2(line.mrp * (1 - discount / 100));
    const unitPrice = typed > 0 ? typed : Number((option ?? product).costPrice);
    let expiryDate: string | undefined;
    if (line.expriay_date) {
      const d = new Date(line.expriay_date);
      if (Number.isNaN(d.getTime())) throw new HttpError(400, `Invalid expiry date for ${product.name}`);
      expiryDate = line.expriay_date;
    }
    return { product, option, quantity: line.quantity, unitPrice, mrp: line.mrp, batch: line.batch_no ? { batchNumber: line.batch_no, expiryDate } : undefined };
  });

  // The same item can appear more than once (one row per batch): one PO line
  // with the total, one receipt line per batch.
  const lineKey = (r: (typeof rows)[number]) => `${r.product.id}:${r.option?.id ?? ''}`;
  const poLines = new Map<string, { productId: string; optionId: string | null; qty: number; cost: number }>();
  for (const r of rows) {
    const cur = poLines.get(lineKey(r)) ?? { productId: r.product.id, optionId: r.option?.id ?? null, qty: 0, cost: 0 };
    cur.qty += r.quantity;
    cur.cost += r.quantity * r.unitPrice;
    poLines.set(lineKey(r), cur);
  }

  const order = await callPurchase<{ id: string; poNumber: string }>(req, '/purchase-orders', {
    supplierId: seller.id,
    items: [...poLines.values()].map((l) => ({ productId: l.productId, ...(l.optionId ? { optionId: l.optionId } : {}), qty: l.qty, unitPrice: round2(l.cost / l.qty) })),
    expectedDeliveryDate: ymd(new Date()),
    paymentStatus: 'UNPAID',
  });

  await callPurchase(req, '/grns', {
    purchaseOrderId: order.id,
    items: rows.map((r) => ({
      productId: r.product.id,
      ...(r.option ? { optionId: r.option.id } : {}),
      receivedQty: r.quantity,
      ...(r.batch ? { batch: r.batch } : {}),
    })),
    receivedBy: user?.name ?? 'Mobile app',
    notes: `Supplier invoice ${body.invoice_no} · entered on the mobile app`,
  });

  // Keep the printed MRP current (the PO only carries the cost).
  for (const r of rows) {
    if (r.mrp > 0) {
      if (r.option) await prisma.productOption.update({ where: { id: r.option.id }, data: { mrp: r.mrp } });
      else await prisma.product.update({ where: { id: r.product.id }, data: { mrp: r.mrp } });
    }
  }

  res.status(201).json({ message: 'Purchase saved', po_number: order.poNumber });
});

export default router;
