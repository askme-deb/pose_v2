import crypto from 'node:crypto';
import { header, toPaise, toRupees, type PaymentGatewayAdapter } from './types';

// PhonePe PG standard checkout (v1 "pay page" API with salt-key X-VERIFY).
// Docs: https://developer.phonepe.com/v1/reference/pay-api-1
const baseUrl = () =>
  process.env.PHONEPE_ENV === 'production' ? 'https://api.phonepe.com/apis/hermes' : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

const saltIndex = () => process.env.PHONEPE_SALT_INDEX || '1';

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

// X-VERIFY = sha256(base64Payload + apiPath + saltKey) + '###' + saltIndex
function xVerify(base64Payload: string, apiPath: string) {
  return `${sha256(base64Payload + apiPath + process.env.PHONEPE_SALT_KEY)}###${saltIndex()}`;
}

async function phonepe<T>(apiPath: string, payload: Record<string, unknown>): Promise<T> {
  const request = Buffer.from(JSON.stringify(payload)).toString('base64');
  const response = await fetch(`${baseUrl()}${apiPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-VERIFY': xVerify(request, apiPath) },
    body: JSON.stringify({ request }),
  });
  const json = (await response.json().catch(() => ({}))) as { success?: boolean; code?: string; message?: string; data?: T };
  if (!response.ok || !json.success) throw new Error(`PhonePe ${apiPath} failed (${json.code ?? response.status}): ${json.message ?? 'unknown error'}`);
  return json.data as T;
}

export const phonepeGateway: PaymentGatewayAdapter = {
  id: 'PHONEPE',

  isConfigured: () => Boolean(process.env.PHONEPE_MERCHANT_ID && process.env.PHONEPE_SALT_KEY),

  async createOrder({ paymentId, amount, customer, returnUrl }) {
    const data = await phonepe<{ instrumentResponse?: { redirectInfo?: { url: string } } }>('/pg/v1/pay', {
      merchantId: process.env.PHONEPE_MERCHANT_ID,
      merchantTransactionId: paymentId,
      merchantUserId: customer.id,
      amount: toPaise(amount),
      redirectUrl: returnUrl ?? process.env.PHONEPE_REDIRECT_URL,
      redirectMode: 'REDIRECT',
      callbackUrl: process.env.PHONEPE_CALLBACK_URL,
      ...(customer.phone ? { mobileNumber: customer.phone.replace(/\D/g, '').slice(-10) } : {}),
      paymentInstrument: { type: 'PAY_PAGE' },
    });
    return {
      gatewayOrderId: paymentId,
      clientPayload: { phonepeTransactionId: paymentId, redirectUrl: data.instrumentResponse?.redirectInfo?.url },
    };
  },

  async refund({ gatewayOrderId, gatewayPaymentId, amount, refundId }) {
    const data = await phonepe<{ transactionId?: string; merchantTransactionId: string }>('/pg/v1/refund', {
      merchantId: process.env.PHONEPE_MERCHANT_ID,
      merchantUserId: 'pospe',
      originalTransactionId: gatewayOrderId,
      merchantTransactionId: refundId,
      amount: toPaise(amount),
      callbackUrl: process.env.PHONEPE_CALLBACK_URL,
    });
    void gatewayPaymentId;
    return { gatewayRefundId: data.transactionId ?? data.merchantTransactionId };
  },

  // Server-to-server callback: body { response: base64 }, header
  // X-VERIFY = sha256(response + saltKey) + '###' + saltIndex.
  parseWebhook(rawBody, headers) {
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const signature = header(headers, 'x-verify');
    if (!saltKey || !signature) return null;

    const body = JSON.parse(rawBody.toString()) as { response?: string };
    if (!body.response) return null;
    const expected = `${sha256(body.response + saltKey)}###${saltIndex()}`;
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const decoded = JSON.parse(Buffer.from(body.response, 'base64').toString('utf8'));
    const data = decoded.data ?? {};
    if (decoded.code === 'PAYMENT_SUCCESS' && data.state === 'COMPLETED') {
      return { status: 'captured', gatewayOrderId: data.merchantTransactionId, gatewayPaymentId: data.transactionId, amount: toRupees(Number(data.amount ?? 0)) };
    }
    if (decoded.code === 'PAYMENT_ERROR' || data.state === 'FAILED') return { status: 'failed', gatewayOrderId: data.merchantTransactionId };
    return { status: 'ignored' };
  },
};
