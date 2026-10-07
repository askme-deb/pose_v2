import crypto from 'node:crypto';
import { header, type PaymentGatewayAdapter } from './types';

// Cashfree Payment Gateway, API version 2023-08-01.
// Docs: https://docs.cashfree.com/reference/pg-new-apis-endpoint
const API_VERSION = '2023-08-01';

const baseUrl = () =>
  process.env.CASHFREE_ENV === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

async function cashfree<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': process.env.CASHFREE_APP_ID!,
      'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
      'x-api-version': API_VERSION,
    },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new Error(`Cashfree ${path} failed (${response.status}): ${json.message ?? 'unknown error'}`);
  return json;
}

export const cashfreeGateway: PaymentGatewayAdapter = {
  id: 'CASHFREE',

  isConfigured: () => Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY),

  async createOrder({ paymentId, amount, customer, returnUrl }) {
    if (!customer.phone) throw new Error('Cashfree requires the customer phone number');
    const notifyUrl = process.env.CASHFREE_WEBHOOK_URL;
    const order = await cashfree<{ order_id: string; payment_session_id: string }>('/orders', {
      order_id: paymentId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: customer.id,
        customer_phone: customer.phone,
        ...(customer.name ? { customer_name: customer.name } : {}),
        ...(customer.email ? { customer_email: customer.email } : {}),
      },
      order_meta: {
        ...(returnUrl ? { return_url: returnUrl } : {}),
        ...(notifyUrl ? { notify_url: notifyUrl } : {}),
      },
    });
    return {
      gatewayOrderId: order.order_id,
      clientPayload: { cashfreeOrderId: order.order_id, paymentSessionId: order.payment_session_id, mode: process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox' },
    };
  },

  async refund({ gatewayOrderId, amount, refundId }) {
    const refund = await cashfree<{ cf_refund_id: string | number; refund_id: string }>(`/orders/${encodeURIComponent(gatewayOrderId)}/refunds`, {
      refund_amount: amount,
      refund_id: refundId,
    });
    return { gatewayRefundId: String(refund.cf_refund_id ?? refund.refund_id) };
  },

  // Signature: base64(HMAC-SHA256(timestamp + rawBody, secretKey)).
  parseWebhook(rawBody, headers) {
    const secret = process.env.CASHFREE_SECRET_KEY;
    const signature = header(headers, 'x-webhook-signature');
    const timestamp = header(headers, 'x-webhook-timestamp');
    if (!secret || !signature || !timestamp) return null;

    const expected = crypto.createHmac('sha256', secret).update(timestamp + rawBody.toString()).digest('base64');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const event = JSON.parse(rawBody.toString());
    const orderId: string | undefined = event.data?.order?.order_id;
    const cfPaymentId = event.data?.payment?.cf_payment_id;
    if (event.type === 'PAYMENT_SUCCESS_WEBHOOK' && event.data?.payment?.payment_status === 'SUCCESS') {
      return { status: 'captured', gatewayOrderId: orderId, gatewayPaymentId: cfPaymentId ? String(cfPaymentId) : undefined, amount: Number(event.data?.payment?.payment_amount) };
    }
    if (event.type === 'PAYMENT_FAILED_WEBHOOK') return { status: 'failed', gatewayOrderId: orderId };
    return { status: 'ignored' };
  },
};
