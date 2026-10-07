export type GatewayId = 'RAZORPAY' | 'CASHFREE' | 'PHONEPE';

export interface CreateOrderInput {
  // Our Payment row id — used as the merchant order/transaction id where the
  // gateway lets the merchant choose it (Cashfree, PhonePe).
  paymentId: string;
  invoiceId: string;
  amount: number; // rupees
  customer: { id: string; name?: string; phone?: string; email?: string };
  returnUrl?: string;
}

export interface CreateOrderResult {
  gatewayOrderId: string;
  // Whatever the client needs to open the gateway's checkout.
  clientPayload: Record<string, unknown>;
}

export interface RefundInput {
  gatewayOrderId: string;
  gatewayPaymentId: string | null;
  amount: number; // rupees
  refundId: string; // our idempotent refund reference
}

export interface WebhookEvent {
  status: 'captured' | 'failed' | 'ignored';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amount?: number; // rupees, as reported by the gateway
}

export interface PaymentGatewayAdapter {
  id: GatewayId;
  isConfigured(): boolean;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  refund(input: RefundInput): Promise<{ gatewayRefundId: string }>;
  /** Verifies the signature over the raw body; returns null when it doesn't verify. */
  parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): WebhookEvent | null;
}

export const toPaise = (rupees: number) => Math.round(rupees * 100);
export const toRupees = (paise: number) => Math.round(paise) / 100;

export function header(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}
