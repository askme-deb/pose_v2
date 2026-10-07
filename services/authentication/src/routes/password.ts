import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireAuth } from '@pospe/permissions';
import { sendAuthOtp } from '@pospe/notifications';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { createOtp, consumeOtp } from '../lib/otp';
import { issueTokens } from '../lib/tokens';
import { serializeUser } from './auth';

const router = Router();

const passwordRule = z.string().min(8, 'Password must be at least 8 characters');
const emailInput = z.object({ email: z.string().email() });
const codeRule = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');

const resetInput = z.object({ email: z.string().email(), code: codeRule, newPassword: passwordRule });
const changeInput = z.object({ currentPassword: z.string().min(1), newPassword: passwordRule });
const verifyInput = z.object({ email: z.string().email(), code: codeRule });

const userRelations = {
  rbacRole: { select: { id: true, title: true, code: true, permissions: true } },
  tenant: { select: { id: true, name: true, slug: true, status: true } },
} as const;

// Same response whether or not the email exists, so this endpoint can't be
// used to discover which addresses have accounts.
const GENERIC_SENT = { sent: true, message: 'If an account exists for that email, a code has been sent.' };

router.post('/password/forgot', async (req, res) => {
  const parsed = emailInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findFirst({ where: { email: parsed.data.email, isActive: true } });
  if (user) {
    const code = await createOtp(user.id, 'PASSWORD_RESET');
    await sendAuthOtp({ tenantId: user.tenantId, to: user.email, name: user.name, code, purpose: 'PASSWORD_RESET' });
    await logAudit(user.tenantId, user.name, 'PASSWORD_RESET_REQUESTED', `Password reset code sent to ${user.email}`, 'MEDIUM', req.ip);
  }
  res.json(GENERIC_SENT);
});

// Also completes a staff invite: invited users receive a PASSWORD_RESET code
// and set their first password here.
router.post('/password/reset', async (req, res) => {
  const parsed = resetInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, code, newPassword } = parsed.data;

  const user = await prisma.user.findFirst({ where: { email, isActive: true } });
  if (!user || !(await consumeOtp(user.id, 'PASSWORD_RESET', code))) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 10),
      tokenVersion: { increment: 1 },
      failedLoginAttempts: 0,
      lockedUntil: null,
      // Receiving the code proves control of the inbox.
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    },
  });
  await logAudit(user.tenantId, user.name, 'PASSWORD_RESET', `${user.name} reset their password`, 'MEDIUM', req.ip);
  res.json({ success: true });
});

router.post('/password/change', requireAuth, async (req, res) => {
  const parsed = changeInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.authUser!.sub } });
  if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10), tokenVersion: { increment: 1 } },
  });
  await logAudit(user.tenantId, user.name, 'PASSWORD_CHANGED', `${user.name} changed their password`, 'MEDIUM', req.ip);
  res.json({ success: true });
});

// Confirms the code emailed at signup and signs the owner straight in.
router.post('/verify-email', async (req, res) => {
  const parsed = verifyInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findFirst({ where: { email: parsed.data.email }, include: userRelations });
  if (!user || !(await consumeOtp(user.id, 'EMAIL_VERIFY', parsed.data.code))) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const verified = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), lastActivityAt: new Date() },
    include: userRelations,
  });
  await logAudit(user.tenantId, user.name, 'EMAIL_VERIFIED', `${user.email} verified`, 'LOW', req.ip);

  const tokens = issueTokens(verified);
  if (!tokens) return res.status(500).json({ error: 'Server auth configuration is missing JWT secrets' });
  res.json({ ...tokens, user: await serializeUser(verified) });
});

router.post('/verify-email/resend', async (req, res) => {
  const parsed = emailInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findFirst({ where: { email: parsed.data.email, emailVerifiedAt: null } });
  if (user) {
    const code = await createOtp(user.id, 'EMAIL_VERIFY');
    await sendAuthOtp({ tenantId: user.tenantId, to: user.email, name: user.name, code, purpose: 'EMAIL_VERIFY' });
  }
  res.json(GENERIC_SENT);
});

export default router;
