import { Router, raw } from 'express';
import { gatewayFor } from '../lib/gateways';
import { handleCapturedPayment, handleFailedPayment } from '../lib/completion';

const router = Router();

// One webhook per gateway, all mounted before express.json() in index.ts:
// the raw bytes are what get signed, and re-serialized JSON is not
// guaranteed byte-identical to what the gateway sent.
for (const [path, gatewayId] of [
  ['razorpay', 'RAZORPAY'],
  ['cashfree', 'CASHFREE'],
  ['phonepe', 'PHONEPE'],
] as const) {
  router.post(`/payments/${path}/webhook`, raw({ type: '*/*' }), async (req, res) => {
    const gateway = gatewayFor(gatewayId)!;
    if (!gateway.isConfigured()) return res.status(503).json({ error: `${gatewayId} is not configured` });

    const rawBody = req.body as Buffer;
    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) return res.status(400).json({ error: 'Missing body' });

    let event;
    try {
      event = gateway.parseWebhook(rawBody, req.headers);
    } catch {
      return res.status(400).json({ error: 'Malformed webhook payload' });
    }
    if (!event) return res.status(401).json({ error: 'Invalid webhook signature' });

    if (event.status === 'ignored') return res.json({ received: true, ignored: true });
    if (event.status === 'failed') {
      await handleFailedPayment(event);
      return res.json({ received: true });
    }

    const outcome = await handleCapturedPayment(event, req.log);
    if (outcome.status === 'not_found') return res.status(404).json({ error: 'No payment matches this order' });
    // 200 for mismatches too: the gateway has nothing to retry; staff are
    // alerted via the payment record's lastCompletionError.
    res.json({ received: true, outcome: outcome.status });
  });
}

export default router;
