import { transporter } from './mailer';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  from?: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}

export async function sendEmail({ to, subject, text, from, attachments }: EmailMessage) {
  await transporter.sendMail({ from: from ?? process.env.MAIL_FROM ?? '"PosPe" <no-reply@pospe.local>', to, subject, text, attachments });
}

// SMS and WhatsApp both go through Twilio's Messages API — WhatsApp is the
// same endpoint with `whatsapp:`-prefixed numbers. Unconfigured channels are
// skipped (logged), never thrown, so a tenant without SMS still gets email.
const twilioConfigured = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

async function sendTwilioMessage(to: string, from: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  // Thrown so a queued job is retried with backoff.
  if (!response.ok) throw new Error(`Twilio responded ${response.status}: ${await response.text()}`);
}

export function normalizeIndianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (phone.trim().startsWith('+')) return `+${digits}`;
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

export async function sendSms(phone: string, body: string): Promise<boolean> {
  const from = process.env.TWILIO_SMS_FROM;
  if (!twilioConfigured() || !from) {
    console.warn('[notification-service] SMS not configured (TWILIO_*); skipping');
    return false;
  }
  await sendTwilioMessage(normalizeIndianPhone(phone), from, body);
  return true;
}

export async function sendWhatsApp(phone: string, body: string): Promise<boolean> {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!twilioConfigured() || !from) {
    console.warn('[notification-service] WhatsApp not configured (TWILIO_*); skipping');
    return false;
  }
  await sendTwilioMessage(`whatsapp:${normalizeIndianPhone(phone)}`, `whatsapp:${from}`, body);
  return true;
}
