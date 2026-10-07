import { buildBirthdayOfferMessage, buildLowStockMessage, type NotificationJob } from '@pospe/notifications';
import { prisma } from './prisma';
import { sendEmail, sendSms, sendWhatsApp } from './channels';

async function tenantContact(tenantId: string) {
  const [profile, tenant] = await Promise.all([
    prisma.tenantProfile.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId } }),
  ]);
  return {
    email: profile?.supportEmail || tenant?.ownerEmail || null,
    phone: profile?.helplinePhone || null,
    name: profile?.registeredName || tenant?.name || 'PosPe',
  };
}

const OTP_COPY: Record<string, { subject: string; lead: string }> = {
  PASSWORD_RESET: { subject: 'Your PosPe password reset code', lead: 'Use this code to reset your password' },
  EMAIL_VERIFY: { subject: 'Verify your PosPe account', lead: 'Use this code to verify your email address' },
  INVITE: { subject: "You've been invited to PosPe", lead: 'Your account is ready. Use this code to set your password' },
};

export interface DeliveryResult {
  delivered: string[];
}

/**
 * Delivers one notification job on every channel it applies to. Shared by
 * the BullMQ worker and the authenticated HTTP fallback route. Throws on a
 * transport failure so the queue retries the job.
 */
export async function deliverNotification(job: NotificationJob): Promise<DeliveryResult> {
  const delivered: string[] = [];

  switch (job.kind) {
    case 'low-stock': {
      const contact = await tenantContact(job.tenantId);
      if (!contact.email) throw new Error('No notification recipient configured for this tenant');
      await sendEmail({
        from: '"PosPe Alerts" <alerts@pospe.local>',
        to: contact.email,
        subject: `Low stock: ${job.productName}`,
        text: `${buildLowStockMessage(job.productName, job.stockQty)} (SKU ${job.sku}, reorder threshold ${job.minThreshold})`,
      });
      delivered.push(`email:${contact.email}`);
      break;
    }
    case 'birthday-offer': {
      const text = buildBirthdayOfferMessage(job.customerName, job.bonusAmount);
      if (job.email) {
        await sendEmail({ from: '"PosPe Rewards" <rewards@pospe.local>', to: job.email, subject: 'Happy Birthday from all of us!', text });
        delivered.push(`email:${job.email}`);
      }
      if (job.phone && (await sendWhatsApp(job.phone, text))) delivered.push(`whatsapp:${job.phone}`);
      break;
    }
    case 'auth-otp': {
      const copy = OTP_COPY[job.purpose];
      await sendEmail({
        to: job.to,
        subject: copy.subject,
        text: `Hi ${job.name},\n\n${copy.lead}: ${job.code}\n\nThis code expires soon. If you didn't request it, you can ignore this email.`,
      });
      delivered.push(`email:${job.to}`);
      break;
    }
    case 'payment-alert': {
      const contact = await tenantContact(job.tenantId);
      const verb = job.event === 'captured' ? 'received' : job.event === 'refunded' ? 'refunded' : 'failed';
      const text = `Payment ${verb}: ₹${job.amount.toFixed(2)} via ${job.gateway} (ref ${job.reference}).`;
      if (contact.email) {
        await sendEmail({ from: '"PosPe Payments" <payments@pospe.local>', to: contact.email, subject: `Payment ${verb} — ₹${job.amount.toFixed(2)}`, text });
        delivered.push(`email:${contact.email}`);
      }
      if (contact.phone && (await sendSms(contact.phone, text))) delivered.push(`sms:${contact.phone}`);
      break;
    }
    case 'report': {
      await sendEmail({
        from: '"PosPe Reports" <reports@pospe.local>',
        to: job.to,
        subject: job.subject,
        text: job.text,
        attachments: [{ filename: job.attachment.filename, content: Buffer.from(job.attachment.contentBase64, 'base64'), contentType: job.attachment.contentType }],
      });
      delivered.push(`email:${job.to}`);
      break;
    }
  }

  return { delivered };
}
