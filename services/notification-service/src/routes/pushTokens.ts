import { Router } from 'express';
import { z } from 'zod';
import { HttpError, tenantIdOf } from '@pospe/permissions';
import { prisma } from '../lib/prisma';

const router = Router();

const registerInput = z.object({
  token: z.string().regex(/^(Expo|Exponent)PushToken\[.+\]$/, 'Not an Expo push token'),
  appId: z.enum(['owner', 'manager', 'cashier']),
  platform: z.enum(['android', 'ios']),
  deviceId: z.string().min(1).max(200).optional(),
  storeId: z.string().min(1).max(100).optional(),
});

// The mobile app registers after every sign-in. A token belongs to one device,
// so registering it again (another person signs in there) re-assigns it.
router.post('/push-tokens', async (req, res) => {
  const parsed = registerInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const tenantId = tenantIdOf(req);
  const userId = req.authUser!.sub;
  const { token, ...rest } = parsed.data;
  const fields = { tenantId, userId, appId: rest.appId, platform: rest.platform, deviceId: rest.deviceId ?? null, storeId: rest.storeId ?? null };
  await prisma.pushToken.upsert({ where: { token }, create: { token, ...fields }, update: fields });
  res.status(204).end();
});

// Called before sign-out. Only the user it's registered to can remove it.
router.delete('/push-tokens/:token', async (req, res) => {
  const { count } = await prisma.pushToken.deleteMany({ where: { token: req.params.token, userId: req.authUser!.sub } });
  if (!count) throw new HttpError(404, 'Push token not registered');
  res.status(204).end();
});

export default router;
