export type NotificationChannel = 'email' | 'sms' | 'push' | 'whatsapp';

export interface NotificationPayload {
  channel: NotificationChannel;
  to: string;
  template: string;
  data: Record<string, unknown>;
}

export const buildLowStockMessage = (productName: string, qty: number) =>
  `Low stock alert: ${productName} has only ${qty} units left.`;

export interface LowStockAlert {
  tenantId: string;
  productName: string;
  sku: string;
  stockQty: number;
  minThreshold: number;
}

// Fire-and-forget on purpose — a slow/down notification-service must never
// block or fail the sale/adjustment that triggered the alert.
export function notifyLowStock(baseUrl: string, alert: LowStockAlert): void {
  fetch(`${baseUrl}/notifications/low-stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alert),
  }).catch(() => {});
}

export const buildBirthdayOfferMessage = (customerName: string, bonusAmount: number) =>
  `Happy Birthday, ${customerName}! We've credited ₹${bonusAmount} to your wallet — treat yourself on your next visit.`;

export interface BirthdayOfferAlert {
  tenantId: string;
  customerName: string;
  email: string;
  bonusAmount: number;
}

// Fire-and-forget for the same reason as notifyLowStock — the cron job's own
// success (crediting the wallet) must never depend on the email actually
// sending.
export function notifyBirthdayOffer(baseUrl: string, alert: BirthdayOfferAlert): void {
  fetch(`${baseUrl}/notifications/birthday-offer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alert),
  }).catch(() => {});
}
