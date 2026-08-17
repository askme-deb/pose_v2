import { Router } from 'express';
import { z } from 'zod';
import speakeasy from 'speakeasy';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/2fa/status', requireAuth, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.authUser!.sub } });
  res.json({ twoFaEnabled: user.twoFaEnabled });
});

// Generates a secret and stores it, but does NOT enable 2FA yet — that only
// happens once the user proves they can actually produce a code from it via
// /2fa/confirm. No QR image (no qrcode package in the repo); the otpauth URL
// and raw key are shown as text for manual/URI entry into an authenticator app.
router.post('/2fa/setup', requireAuth, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.authUser!.sub } });
  const secret = speakeasy.generateSecret({ name: `ApexPOS (${user.email})`, issuer: 'ApexPOS' });

  await prisma.user.update({ where: { id: user.id }, data: { twoFaSecret: secret.base32 } });
  res.json({ secret: secret.base32, otpauthUrl: secret.otpauth_url });
});

const confirmInput = z.object({ token: z.string().length(6) });

router.post('/2fa/confirm', requireAuth, async (req, res) => {
  const parsed = confirmInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.authUser!.sub } });
  if (!user.twoFaSecret) return res.status(400).json({ error: 'Call /2fa/setup first' });

  const valid = speakeasy.totp.verify({
    secret: user.twoFaSecret,
    encoding: 'base32',
    token: parsed.data.token,
    window: 1,
  });
  if (!valid) return res.status(400).json({ error: 'Invalid code' });

  await prisma.user.update({ where: { id: user.id }, data: { twoFaEnabled: true } });
  await logAudit(user.tenantId, user.name, '2FA_ENABLED', `${user.name} enabled two-factor authentication`, 'LOW');
  res.json({ success: true });
});

router.post('/2fa/disable', requireAuth, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.authUser!.sub } });
  await prisma.user.update({ where: { id: user.id }, data: { twoFaEnabled: false, twoFaSecret: null } });
  await logAudit(user.tenantId, user.name, '2FA_DISABLED', `${user.name} disabled two-factor authentication`, 'MEDIUM');
  res.json({ success: true });
});

export default router;
