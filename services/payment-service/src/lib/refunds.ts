import { HttpError } from '@pospe/permissions';
import { notifyPayment } from '@pospe/notifications';
import { round2 } from '@pospe/utilities';
import { prisma } from './prisma';
import { gatewayFor } from './gateways';

/**
 * Refunds (part of) a captured payment through its gateway and records it.
 * The refund reference is derived from the payment and the running refunded
 * total, so retrying the same refund request is idempotent at the gateway.
 */
export async function refundPayment(paymentId: string, amount: number, reason?: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { invoice: { select: { store: { select: { tenantId: true } } } } },
  });
  if (!payment) throw new HttpError(404, 'Payment not found');
  if (payment.status !== 'CAPTURED' && payment.status !== 'PARTIALLY_REFUNDED') {
    throw new HttpError(400, `Only captured payments can be refunded (this one is ${payment.status})`);
  }

  const alreadyRefunded = Number(payment.refundedAmount);
  const refundable = round2(Number(payment.amount) - alreadyRefunded);
  const value = round2(amount);
  if (value <= 0 || value > refundable) throw new HttpError(400, `Refund amount must be between 0 and ${refundable}`);

  const gateway = gatewayFor(payment.gateway);
  if (!gateway?.isConfigured()) throw new HttpError(503, `${payment.gateway} is not configured`);
  if (!payment.gatewayOrderId) throw new HttpError(400, 'Payment has no gateway order to refund');

  const refundId = `rf_${payment.id}_${Math.round(alreadyRefunded * 100)}`;
  const { gatewayRefundId } = await gateway.refund({
    gatewayOrderId: payment.gatewayOrderId,
    gatewayPaymentId: payment.gatewayPaymentId,
    amount: value,
    refundId,
  });

  const refundedAmount = round2(alreadyRefunded + value);
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      refundedAmount,
      gatewayRefundId,
      status: refundedAmount >= Number(payment.amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      ...(reason ? { lastCompletionError: reason } : {}),
    },
  });

  notifyPayment({ tenantId: payment.invoice.store.tenantId, event: 'refunded', amount: value, gateway: payment.gateway, reference: gatewayRefundId });
  return updated;
}
