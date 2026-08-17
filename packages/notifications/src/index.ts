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
