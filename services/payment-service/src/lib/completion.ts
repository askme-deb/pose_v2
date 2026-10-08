import { signInternalToken } from '@pospe/permissions';
import { notifyPayment } from '@pospe/notifications';
import { createWorker, enqueue, queueingEnabled } from '@pospe/utilities';
import { prisma } from './prisma';
import { gatewayFor, type WebhookEvent } from './gateways';
import { refundPayment } from './refunds';

const SALES_SERVICE_URL = () => process.env.SALES_SERVICE_URL || 'http://localhost:4005';
export const COMPLETION_QUEUE = 'payment-completion';
const MAX_SWEEP_ATTEMPTS = 20;

type Log = { error: (obj: unknown, msg: string) => void; warn?: (obj: unknown, msg: string) => void };

export type CaptureOutcome =
  | { status: 'not_found' }
  | { status: 'amount_mismatch'; expected: number; received: number }
  | { status: 'recorded'; paymentId: string };

/**
 * Records a gateway-confirmed payment and turns the held bill into a real
 * invoice. Idempotent: gateways retry webhooks, and a replay of an already
 * captured payment just re-attempts completion (itself idempotent).
 */
export async function handleCapturedPayment(event: WebhookEvent, log?: Log): Promise<CaptureOutcome> {
  if (!event.gatewayOrderId) return { status: 'not_found' };
  const payment = await prisma.payment.findUnique({ where: { gatewayOrderId: event.gatewayOrderId } });
  if (!payment) return { status: 'not_found' };

  // Never complete a bill for less than it costs: the captured amount must
  // match what this order was created for.
  const expected = Number(payment.amount);
  if (event.amount !== undefined && Math.abs(event.amount - expected) > 0.01) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'CAPTURED', gatewayPaymentId: event.gatewayPaymentId ?? payment.gatewayPaymentId, lastCompletionError: `Amount mismatch: expected ${expected}, captured ${event.amount}` },
    });
    log?.error({ paymentId: payment.id, expected, received: event.amount }, 'Captured amount does not match order amount — not completing bill');
    return { status: 'amount_mismatch', expected, received: event.amount };
  }

  if (payment.status === 'CREATED' || payment.status === 'FAILED') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'CAPTURED', gatewayPaymentId: event.gatewayPaymentId ?? payment.gatewayPaymentId },
    });
    const tenant = await prisma.invoice.findUnique({ where: { id: payment.invoiceId }, select: { store: { select: { tenantId: true } } } });
    if (tenant) {
      notifyPayment({ tenantId: tenant.store.tenantId, event: 'captured', amount: expected, gateway: payment.gateway, reference: event.gatewayPaymentId ?? payment.id });
    }
  }

  await completePayment(payment.id, log);
  return { status: 'recorded', paymentId: payment.id };
}

export async function handleFailedPayment(event: WebhookEvent) {
  if (!event.gatewayOrderId) return;
  await prisma.payment.updateMany({ where: { gatewayOrderId: event.gatewayOrderId, status: 'CREATED' }, data: { status: 'FAILED' } });
}

/**
 * Completes one captured payment:
 * - held bill still HELD → checkout through sales-service (stock, GST,
 *   loyalty…), with idempotency key `payment:<id>` so retries can never
 *   create a second invoice; then repoint the payment at the real invoice
 *   (so refunds find it) and cancel the placeholder.
 * - held bill was cancelled/recalled before the money arrived → refund it,
 *   since there is nothing left to bill.
 * Failures are recorded and retried (BullMQ when Redis is configured, and
 * the periodic sweeper either way). Returns true when the payment is settled.
 */
export async function completePayment(paymentId: string, log?: Log): Promise<boolean> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { invoice: { include: { items: true, store: { select: { id: true, tenantId: true } } } } },
  });
  if (!payment || payment.status !== 'CAPTURED') return true;
  const held = payment.invoice;
  const tenantId = held.store.tenantId;

  if (held.status === 'PAID' || held.status === 'PARTIALLY_PAID' || held.status === 'REFUNDED') return true;

  if (held.status === 'CANCELLED' || held.status === 'DRAFT') {
    try {
      await refundPayment(payment.id, Number(payment.amount) - Number(payment.refundedAmount), 'Bill was cancelled before payment completed');
      log?.warn?.({ paymentId }, 'Auto-refunded payment for a cancelled held bill');
      return true;
    } catch (err) {
      await recordFailure(paymentId, `Auto-refund failed: ${(err as Error).message}`);
      return false;
    }
  }

  const internalToken = signInternalToken(tenantId);
  try {
    const response = await fetch(`${SALES_SERVICE_URL()}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-store-id': held.storeId,
        'idempotency-key': `payment:${payment.id}`,
        ...(internalToken ? { Authorization: `Bearer ${internalToken}` } : {}),
      },
      body: JSON.stringify({
        customerId: held.customerId ?? undefined,
        paymentMethod: 'UPI',
        // Charge exactly what the customer just paid for: the held bill's
        // snapshotted line prices (which may include a manual override).
        items: held.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: Number(item.price) })),
        discountPercent: held.heldDiscountPercent ? Number(held.heldDiscountPercent) : 0,
        customerPhone: held.customerPhone ?? undefined,
        location: held.location ?? undefined,
        seatNo: held.seatNo ?? undefined,
        // The gateway's payment id is the transaction reference printed on the bill.
        paymentReference: payment.gatewayPaymentId ?? undefined,
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: unknown };
      throw new Error(`sales-service returned ${response.status}: ${JSON.stringify(body.error ?? '')}`);
    }
    const invoice = (await response.json()) as { id: string };

    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { invoiceId: invoice.id, lastCompletionError: null } }),
      prisma.invoice.update({ where: { id: held.id }, data: { status: 'CANCELLED' } }),
    ]);
    return true;
  } catch (err) {
    log?.error({ err, paymentId }, 'Failed to complete paid held bill — will retry');
    await recordFailure(paymentId, (err as Error).message);
    await scheduleRetry(paymentId);
    return false;
  }
}

async function recordFailure(paymentId: string, message: string) {
  await prisma.payment.update({
    where: { id: paymentId },
    data: { completionAttempts: { increment: 1 }, lastCompletionError: message.slice(0, 500) },
  });
}

async function scheduleRetry(paymentId: string) {
  if (!queueingEnabled()) return; // the sweeper below still picks it up
  // jobId dedupes repeated failures into one pending retry job.
  await enqueue(COMPLETION_QUEUE, 'complete', { paymentId }, { jobId: `complete:${paymentId}`, delay: 10_000 }).catch(() => {});
}

/** Starts the retry worker (Redis) and the periodic sweeper (always). */
export function startCompletionRetries() {
  if (queueingEnabled()) {
    createWorker<{ paymentId: string }>(COMPLETION_QUEUE, async (job) => {
      const settled = await completePayment(job.data.paymentId);
      if (!settled) throw new Error('Completion still failing'); // BullMQ retries with backoff
    }, 2);
  }

  const sweep = async () => {
    const stuck = await prisma.payment.findMany({
      where: {
        status: 'CAPTURED',
        completionAttempts: { lt: MAX_SWEEP_ATTEMPTS },
        invoice: { status: { in: ['HELD', 'CANCELLED'] } },
        updatedAt: { lt: new Date(Date.now() - 60_000) },
      },
      select: { id: true },
      take: 50,
    });
    for (const p of stuck) await completePayment(p.id).catch(() => {});
  };
  const interval = setInterval(() => void sweep().catch(() => {}), Number(process.env.PAYMENT_SWEEP_INTERVAL_MS ?? 5 * 60_000));
  interval.unref();
}

export function isGatewayConfigured(id: string) {
  return gatewayFor(id)?.isConfigured() ?? false;
}
