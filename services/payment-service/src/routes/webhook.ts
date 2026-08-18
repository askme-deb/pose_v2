import { Router, raw } from 'express';
import { RazorpaySdk } from '../lib/razorpay';
import { prisma } from '../lib/prisma';

const router = Router();

// Mounted before express.json() in index.ts (same reason api-gateway mounts
// its proxy before express.json() — the raw bytes are what get HMAC'd,
// re-serialized JSON is not guaranteed byte-identical to what Razorpay sent).
router.post('/payments/razorpay/webhook', raw({ type: '*/*' }), async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return res.status(503).json({ error: 'Webhook secret is not configured' });

  const signature = req.header('x-razorpay-signature');
  const rawBody = req.body as Buffer;
  if (!signature || !Buffer.isBuffer(rawBody)) {
    return res.status(400).json({ error: 'Missing signature or body' });
  }

  const valid = RazorpaySdk.validateWebhookSignature(rawBody.toString(), signature, secret);
  if (!valid) return res.status(401).json({ error: 'Invalid webhook signature' });

  const event = JSON.parse(rawBody.toString());
  if (event.event !== 'payment.captured') {
    return res.status(200).json({ received: true, ignored: event.event });
  }

  const entity = event.payload?.payment?.entity;
  const gatewayOrderId: string | undefined = entity?.order_id;
  const gatewayPaymentId: string | undefined = entity?.id;
  if (!gatewayOrderId || !gatewayPaymentId) {
    return res.status(400).json({ error: 'Malformed payment.captured payload' });
  }

  const payment = await prisma.payment.findUnique({ where: { gatewayOrderId } });
  if (!payment) return res.status(404).json({ error: 'No payment matches this order' });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'CAPTURED', gatewayPaymentId },
  });

  await completeHeldInvoiceIfNeeded(payment.invoiceId, req.log);

  res.json({ received: true });
});

// A captured online payment for a held bill still needs to go through
// sales-service's real checkout (stock decrement, GST, loyalty points,
// low-stock alerts, search indexing) — the same transition billing-service's
// own /recall endpoint hands off to a cashier for. Reusing it here rather
// than re-deriving a second copy of that transaction.
async function completeHeldInvoiceIfNeeded(invoiceId: string, log?: { error: (obj: unknown, msg: string) => void }) {
  const held = await prisma.invoice.findFirst({
    where: { id: invoiceId, status: 'HELD' },
    include: { items: true },
  });
  if (!held) return;

  const SALES_SERVICE_URL = process.env.SALES_SERVICE_URL || 'http://localhost:4005';
  try {
    const response = await fetch(`${SALES_SERVICE_URL}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-store-id': held.storeId },
      body: JSON.stringify({
        customerId: held.customerId ?? undefined,
        paymentMethod: 'UPI',
        items: held.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        discountPercent: held.heldDiscountPercent ? Number(held.heldDiscountPercent) : 0,
      }),
    });
    if (!response.ok) {
      log?.error({ status: response.status, invoiceId }, 'sales-service rejected the post-payment checkout');
      return;
    }
    // Cancel rather than delete — this Payment row's own FK points at the
    // held invoice; Postgres correctly rejects deleting a row something
    // still references. CANCELLED also reads more honestly: this
    // placeholder is done, superseded by the real invoice sales-service
    // just created above.
    await prisma.invoice.update({ where: { id: held.id }, data: { status: 'CANCELLED' } });
  } catch (err) {
    log?.error({ err, invoiceId }, 'Failed to reach sales-service to complete a paid held bill');
  }
}

export default router;
