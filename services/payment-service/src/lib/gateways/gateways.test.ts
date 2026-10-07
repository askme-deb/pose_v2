import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { cashfreeGateway } from './cashfree';
import { phonepeGateway } from './phonepe';
import { razorpayGateway } from './razorpay';

beforeEach(() => {
  process.env.CASHFREE_APP_ID = 'app';
  process.env.CASHFREE_SECRET_KEY = 'cf-secret';
  process.env.PHONEPE_MERCHANT_ID = 'MID';
  process.env.PHONEPE_SALT_KEY = 'pp-salt';
  process.env.PHONEPE_SALT_INDEX = '1';
  process.env.RAZORPAY_KEY_ID = 'rzp_key';
  process.env.RAZORPAY_KEY_SECRET = 'rzp_secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp-webhook';
});

test('Cashfree: valid signature parses a captured payment', () => {
  const body = JSON.stringify({
    type: 'PAYMENT_SUCCESS_WEBHOOK',
    data: { order: { order_id: 'pay_1' }, payment: { cf_payment_id: 123, payment_status: 'SUCCESS', payment_amount: 250.5 } },
  });
  const ts = '1700000000';
  const sig = crypto.createHmac('sha256', 'cf-secret').update(ts + body).digest('base64');
  const event = cashfreeGateway.parseWebhook(Buffer.from(body), { 'x-webhook-signature': sig, 'x-webhook-timestamp': ts });
  assert.deepEqual(event, { status: 'captured', gatewayOrderId: 'pay_1', gatewayPaymentId: '123', amount: 250.5 });
});

test('Cashfree: tampered body is rejected', () => {
  const ts = '1700000000';
  const sig = crypto.createHmac('sha256', 'cf-secret').update(ts + '{"a":1}').digest('base64');
  assert.equal(cashfreeGateway.parseWebhook(Buffer.from('{"a":2}'), { 'x-webhook-signature': sig, 'x-webhook-timestamp': ts }), null);
});

test('PhonePe: valid X-VERIFY parses a completed payment (amount in paise)', () => {
  const payload = { code: 'PAYMENT_SUCCESS', data: { merchantTransactionId: 'pay_2', transactionId: 'T9', amount: 12345, state: 'COMPLETED' } };
  const response = Buffer.from(JSON.stringify(payload)).toString('base64');
  const xVerify = `${crypto.createHash('sha256').update(response + 'pp-salt').digest('hex')}###1`;
  const event = phonepeGateway.parseWebhook(Buffer.from(JSON.stringify({ response })), { 'x-verify': xVerify });
  assert.deepEqual(event, { status: 'captured', gatewayOrderId: 'pay_2', gatewayPaymentId: 'T9', amount: 123.45 });
});

test('PhonePe: wrong salt is rejected', () => {
  const response = Buffer.from('{}').toString('base64');
  const xVerify = `${crypto.createHash('sha256').update(response + 'other').digest('hex')}###1`;
  assert.equal(phonepeGateway.parseWebhook(Buffer.from(JSON.stringify({ response })), { 'x-verify': xVerify }), null);
});

test('Razorpay: valid signature parses payment.captured (amount in paise)', () => {
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_rzp', order_id: 'order_1', amount: 50000 } } } });
  const sig = crypto.createHmac('sha256', 'rzp-webhook').update(body).digest('hex');
  const event = razorpayGateway.parseWebhook(Buffer.from(body), { 'x-razorpay-signature': sig });
  assert.deepEqual(event, { status: 'captured', gatewayOrderId: 'order_1', gatewayPaymentId: 'pay_rzp', amount: 500 });
});

test('Razorpay: unsigned or forged webhooks are rejected', () => {
  const body = JSON.stringify({ event: 'payment.captured' });
  assert.equal(razorpayGateway.parseWebhook(Buffer.from(body), {}), null);
  assert.equal(razorpayGateway.parseWebhook(Buffer.from(body), { 'x-razorpay-signature': 'deadbeef' }), null);
});

test('gateways report unconfigured when credentials are missing', () => {
  delete process.env.CASHFREE_SECRET_KEY;
  assert.equal(cashfreeGateway.isConfigured(), false);
});
