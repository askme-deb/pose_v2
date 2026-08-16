export type NotificationChannel = 'email' | 'sms' | 'push' | 'whatsapp';

export interface NotificationPayload {
  channel: NotificationChannel;
  to: string;
  template: string;
  data: Record<string, unknown>;
}

export const buildLowStockMessage = (productName: string, qty: number) =>
  `Low stock alert: ${productName} has only ${qty} units left.`;
