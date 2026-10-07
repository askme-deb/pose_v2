import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId, resolveStoreId } from '../lib/prisma';
import { GATEWAYS, gatewayFor, type GatewayId } from '../lib/gateways';
import { refundPayment } from '../lib/refunds';
import { completePayment } from '../lib/completion';

const router = Router();

const createOrderInput = z.object({
  invoiceId: z.string().min(1),
  gateway: z.enum(['RAZORPAY', 'CASHFREE', 'PHONEPE']).default('RAZORPAY'),
  customerPhone: z.string().optional(),
  returnUrl: z.string().url().optional(),
});

const refundInput = z.object({
  amount: z.number().positive(),
  reason: z.string().optional(),
});

router.get('/payments/gateways', (_req, res) => {
  res.json(Object.values(GATEWAYS).map((g) => ({ id: g.id, configured: g.isConfigured() })));
});

// Pay-online only ever targets a HELD bill. Completing it goes through
// sales-service's real checkout once the gateway webhook confirms payment
// (see lib/completion.ts), never a second write path against the invoice.
async function createOrder(req: Request, res: Response, input: z.infer<typeof createOrderInput>) {
  const tenantId = await resolveTenantId(req);
  const storeId = await resolveStoreId(tenantId, req.header('x-store-id') ?? undefined, req.authUser?.storeId);

  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, storeId, status: 'HELD' },
    include: { customer: { select: { id: true, name: true, phone: true, email: true } } },
  });
  if (!invoice) return res.status(404).json({ error: 'Held bill not found' });

  const gateway = gatewayFor(input.gateway)!;
  if (!gateway.isConfigured()) return res.status(503).json({ error: `${input.gateway} is not configured` });

  const payment = await prisma.payment.create({
    data: { invoiceId: invoice.id, gateway: input.gateway, amount: invoice.total, status: 'CREATED' },
  });

  try {
    const order = await gateway.createOrder({
      paymentId: payment.id,
      invoiceId: invoice.id,
      amount: Number(invoice.total),
      customer: {
        id: invoice.customer?.id ?? `walkin_${tenantId.slice(-8)}`,
        name: invoice.customer?.name ?? invoice.customerName,
        phone: input.customerPhone ?? invoice.customer?.phone ?? undefined,
        email: invoice.customer?.email ?? undefined,
      },
      returnUrl: input.returnUrl,
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { gatewayOrderId: order.gatewayOrderId } });
    res.status(201).json({ paymentId: payment.id, gateway: input.gateway, amount: Number(invoice.total), currency: 'INR', ...order.clientPayload });
  } catch (err) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', lastCompletionError: (err as Error).message.slice(0, 500) } });
    req.log?.error({ err }, `${input.gateway} order creation failed`);
    res.status(502).json({ error: 'Payment gateway rejected the order request' });
  }
}

router.post('/payments/orders', requirePermission('billing:create'), async (req, res) => {
  const parsed = createOrderInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return createOrder(req, res, parsed.data);
});

// Kept for existing POS clients; same as /payments/orders with gateway RAZORPAY.
router.post('/payments/razorpay/order', requirePermission('billing:create'), async (req, res) => {
  const parsed = createOrderInput.safeParse({ ...req.body, gateway: 'RAZORPAY' });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return createOrder(req, res, parsed.data);
});

async function findTenantPayment(req: Request, paymentId: string) {
  const tenantId = await resolveTenantId(req);
  return prisma.payment.findFirst({ where: { id: paymentId, invoice: { store: { tenantId } } } });
}

router.post('/payments/:id/refund', requirePermission('billing:refund'), async (req, res) => {
  const parsed = refundInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const payment = await findTenantPayment(req, req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json(await refundPayment(payment.id, parsed.data.amount, parsed.data.reason));
});

// Manual retry for a captured payment whose bill didn't complete.
router.post('/payments/:id/complete', requirePermission('payment:manage'), async (req, res) => {
  const payment = await findTenantPayment(req, req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  const settled = await completePayment(payment.id, req.log);
  const updated = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  res.status(settled ? 200 : 502).json(updated);
});

router.get('/payments/:invoiceId', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const payments = await prisma.payment.findMany({
    where: { invoiceId: req.params.invoiceId, invoice: { store: { tenantId } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(payments);
});

export type { GatewayId };
export default router;
