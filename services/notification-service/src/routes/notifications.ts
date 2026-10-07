import { Router } from 'express';
import { z } from 'zod';
import { HttpError, tenantIdOf } from '@pospe/permissions';
import type { NotificationJob } from '@pospe/notifications';
import { deliverNotification } from '../lib/deliver';

const router = Router();

const lowStockInput = z.object({
  productName: z.string().min(1),
  sku: z.string().min(1),
  stockQty: z.number().int(),
  minThreshold: z.number().int(),
});

const birthdayOfferInput = z.object({
  customerName: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().nullish(),
  bonusAmount: z.number().positive(),
});

const authOtpInput = z.object({
  to: z.string().email(),
  name: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
  purpose: z.enum(['PASSWORD_RESET', 'EMAIL_VERIFY', 'INVITE']),
});

const paymentAlertInput = z.object({
  event: z.enum(['captured', 'refunded', 'failed']),
  amount: z.number().nonnegative(),
  gateway: z.string().min(1),
  reference: z.string().min(1),
});

const reportInput = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  text: z.string(),
  attachment: z.object({ filename: z.string().min(1), contentBase64: z.string().min(1), contentType: z.string().min(1) }),
});

const jobInput = z.discriminatedUnion('kind', [
  lowStockInput.extend({ kind: z.literal('low-stock') }),
  birthdayOfferInput.extend({ kind: z.literal('birthday-offer') }),
  authOtpInput.extend({ kind: z.literal('auth-otp') }),
  paymentAlertInput.extend({ kind: z.literal('payment-alert') }),
  reportInput.extend({ kind: z.literal('report') }),
]);

// The tenant always comes from the caller's (usually internal, 60s) token —
// a body-supplied tenantId would let any user email any tenant's owner.
function withTenant<T extends object>(req: Parameters<typeof tenantIdOf>[0], body: T) {
  return { ...body, tenantId: tenantIdOf(req) };
}

// HTTP fallback for @pospe/notifications' dispatchNotification when Redis
// isn't configured. With Redis, the same jobs arrive via the BullMQ worker.
router.post('/notifications/dispatch', async (req, res) => {
  const parsed = jobInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = await deliverNotification(withTenant(req, parsed.data) as NotificationJob);
  res.status(202).json({ sent: true, ...result });
});

router.post('/notifications/low-stock', async (req, res) => {
  const parsed = lowStockInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const result = await deliverNotification({ kind: 'low-stock', ...withTenant(req, parsed.data) });
    res.status(202).json({ sent: true, ...result });
  } catch (err) {
    throw new HttpError(404, (err as Error).message);
  }
});

router.post('/notifications/birthday-offer', async (req, res) => {
  const parsed = birthdayOfferInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = await deliverNotification({ kind: 'birthday-offer', ...withTenant(req, parsed.data) });
  res.status(202).json({ sent: true, ...result });
});

export default router;
