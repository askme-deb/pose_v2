import { Router } from 'express';
import { z } from 'zod';
import { prisma, resolveTenantId, resolveStoreId } from '../lib/prisma';
import { getRazorpayClient } from '../lib/razorpay';

const router = Router();

const createOrderInput = z.object({
  invoiceId: z.string().min(1),
});

// Pay-online only ever targets a HELD bill — a PAID invoice already has its
// money accounted for through billing-service's checkout, and completing a
// held one through this path still goes through sales-service's real
// checkout once the webhook confirms payment (see webhook.ts), never a
// second, competing write path against the same Invoice row.
router.post('/payments/razorpay/order', async (req, res) => {
  const parsed = createOrderInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { invoiceId } = parsed.data;

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined);

  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, storeId, status: 'HELD' } });
  if (!invoice) return res.status(404).json({ error: 'Held bill not found' });

  const razorpay = getRazorpayClient();
  if (!razorpay) return res.status(503).json({ error: 'Payment gateway is not configured' });

  const amountPaise = Math.round(Number(invoice.total) * 100);
  let order;
  try {
    order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: invoice.id,
      notes: { invoiceId: invoice.id },
    });
  } catch (err) {
    req.log?.error({ err }, 'Razorpay order creation failed');
    return res.status(502).json({ error: 'Payment gateway rejected the order request' });
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      gateway: 'RAZORPAY',
      gatewayOrderId: order.id,
      amount: invoice.total,
      status: 'CREATED',
    },
  });

  res.status(201).json({
    paymentId: payment.id,
    razorpayOrderId: order.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    amount: amountPaise,
    currency: 'INR',
  });
});

router.get('/payments/:invoiceId', async (req, res) => {
  const payments = await prisma.payment.findMany({
    where: { invoiceId: req.params.invoiceId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(payments);
});

export default router;
