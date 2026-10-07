import { signInternalToken } from '@pospe/permissions';
import { enqueue, queueingEnabled } from '@pospe/utilities';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'whatsapp';

export interface NotificationPayload {
  channel: NotificationChannel;
  to: string;
  template: string;
  data: Record<string, unknown>;
}

export const NOTIFICATION_QUEUE = 'notifications';

export const buildLowStockMessage = (productName: string, qty: number) =>
  `Low stock alert: ${productName} has only ${qty} units left.`;

export const buildBirthdayOfferMessage = (customerName: string, bonusAmount: number) =>
  `Happy Birthday, ${customerName}! We've credited ₹${bonusAmount} to your wallet — treat yourself on your next visit.`;

export interface LowStockAlert {
  tenantId: string;
  productName: string;
  sku: string;
  stockQty: number;
  minThreshold: number;
}

export interface BirthdayOfferAlert {
  tenantId: string;
  customerName: string;
  email: string;
  phone?: string | null;
  bonusAmount: number;
}

export interface AuthOtpAlert {
  tenantId: string;
  to: string;
  name: string;
  code: string;
  purpose: 'PASSWORD_RESET' | 'EMAIL_VERIFY' | 'INVITE';
}

export interface PaymentAlert {
  tenantId: string;
  event: 'captured' | 'refunded' | 'failed';
  amount: number;
  gateway: string;
  reference: string;
}

export interface ReportEmail {
  tenantId: string;
  to: string;
  subject: string;
  text: string;
  attachment: { filename: string; contentBase64: string; contentType: string };
}

/** Every job notification-service knows how to deliver, discriminated by `kind`. */
export type NotificationJob =
  | ({ kind: 'low-stock' } & LowStockAlert)
  | ({ kind: 'birthday-offer' } & BirthdayOfferAlert)
  | ({ kind: 'auth-otp' } & AuthOtpAlert)
  | ({ kind: 'payment-alert' } & PaymentAlert)
  | ({ kind: 'report' } & ReportEmail);

const defaultServiceUrl = () => process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4007';

/**
 * Hands a notification to notification-service without ever blocking or
 * failing the caller's own work (a sale, a stock adjustment, a signup).
 * With Redis configured the job goes onto a BullMQ queue — durable, retried
 * with backoff if SMTP/SMS is down. Without Redis it falls back to a direct
 * HTTP call authenticated with a short-lived internal token for the job's
 * tenant.
 */
export async function dispatchNotification(job: NotificationJob, baseUrl = defaultServiceUrl()): Promise<void> {
  if (queueingEnabled()) {
    try {
      await enqueue<NotificationJob>(NOTIFICATION_QUEUE, job.kind, job);
      return;
    } catch (err) {
      console.warn(`[notifications] queue unavailable, sending ${job.kind} directly:`, (err as Error).message);
    }
  }
  try {
    const token = signInternalToken(job.tenantId);
    await fetch(`${baseUrl}/notifications/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(job),
    });
  } catch (err) {
    console.error(`[notifications] failed to dispatch ${job.kind}:`, (err as Error).message);
  }
}

// Fire-and-forget on purpose — a slow/down notification-service must never
// block or fail the sale/adjustment that triggered the alert.
export function notifyLowStock(baseUrl: string, alert: LowStockAlert): void {
  void dispatchNotification({ kind: 'low-stock', ...alert }, baseUrl);
}

// Fire-and-forget for the same reason as notifyLowStock — the cron job's own
// success (crediting the wallet) must never depend on the email actually
// sending.
export function notifyBirthdayOffer(baseUrl: string, alert: BirthdayOfferAlert): void {
  void dispatchNotification({ kind: 'birthday-offer', ...alert }, baseUrl);
}

export function notifyPayment(alert: PaymentAlert): void {
  void dispatchNotification({ kind: 'payment-alert', ...alert });
}

export function sendReportEmail(report: ReportEmail): Promise<void> {
  return dispatchNotification({ kind: 'report', ...report });
}

export function sendAuthOtp(alert: AuthOtpAlert): Promise<void> {
  return dispatchNotification({ kind: 'auth-otp', ...alert });
}
