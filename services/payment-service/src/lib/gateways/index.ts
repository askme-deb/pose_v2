import { cashfreeGateway } from './cashfree';
import { phonepeGateway } from './phonepe';
import { razorpayGateway } from './razorpay';
import type { GatewayId, PaymentGatewayAdapter } from './types';

export const GATEWAYS: Record<GatewayId, PaymentGatewayAdapter> = {
  RAZORPAY: razorpayGateway,
  CASHFREE: cashfreeGateway,
  PHONEPE: phonepeGateway,
};

export function gatewayFor(id: string): PaymentGatewayAdapter | null {
  return GATEWAYS[id as GatewayId] ?? null;
}

export type { GatewayId, PaymentGatewayAdapter, WebhookEvent } from './types';
