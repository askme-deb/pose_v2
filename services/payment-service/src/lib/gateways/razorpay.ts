import { getRazorpayClient, RazorpaySdk } from '../razorpay';
import { header, toPaise, toRupees, type PaymentGatewayAdapter } from './types';

export const razorpayGateway: PaymentGatewayAdapter = {
  id: 'RAZORPAY',

  isConfigured: () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),

  async createOrder({ invoiceId, amount }) {
    const razorpay = getRazorpayClient();
    if (!razorpay) throw new Error('Razorpay is not configured');
    const order = await razorpay.orders.create({
      amount: toPaise(amount),
      currency: 'INR',
      receipt: invoiceId,
      notes: { invoiceId },
    });
    return {
      gatewayOrderId: order.id,
      clientPayload: { razorpayOrderId: order.id, razorpayKeyId: process.env.RAZORPAY_KEY_ID, amount: toPaise(amount), currency: 'INR' },
    };
  },

  async refund({ gatewayPaymentId, amount, refundId }) {
    const razorpay = getRazorpayClient();
    if (!razorpay) throw new Error('Razorpay is not configured');
    if (!gatewayPaymentId) throw new Error('Payment has no Razorpay payment id to refund');
    const refund = await razorpay.payments.refund(gatewayPaymentId, { amount: toPaise(amount), receipt: refundId });
    return { gatewayRefundId: refund.id };
  },

  parseWebhook(rawBody, headers) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const signature = header(headers, 'x-razorpay-signature');
    if (!secret || !signature) return null;
    if (!RazorpaySdk.validateWebhookSignature(rawBody.toString(), signature, secret)) return null;

    const event = JSON.parse(rawBody.toString());
    const entity = event.payload?.payment?.entity;
    if (event.event === 'payment.captured') {
      return { status: 'captured', gatewayOrderId: entity?.order_id, gatewayPaymentId: entity?.id, amount: toRupees(Number(entity?.amount ?? 0)) };
    }
    if (event.event === 'payment.failed') {
      return { status: 'failed', gatewayOrderId: entity?.order_id, gatewayPaymentId: entity?.id };
    }
    return { status: 'ignored' };
  },
};
