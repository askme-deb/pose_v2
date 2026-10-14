import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requirePermission } from '@pospe/permissions';
import { sendAuthOtp } from '@pospe/notifications';
import { prisma } from '../lib/prisma';
import { logAudit, actorOf } from '../lib/audit';
import { createOtp, OTP_TTL_MINUTES } from '../lib/otp';
import { setUpTenant } from '../lib/provisioning';

const router = Router();

const ownerInput = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
});

// Platform admin: creates the owner account (plus the store, profile and
// starter roles, if missing) for a tenant provisioned from the admin portal,
// and emails the owner an invite code to set their password, the same way
// staff invites work. Also repairs tenants created before this existed.
router.post('/tenants/:tenantId/owner', requirePermission('platform:manage'), async (req, res) => {
  const parsed = ownerInput.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenant = await prisma.tenant.findUnique({ where: { id: req.params.tenantId } });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  if (await prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'TENANT_OWNER' } })) {
    return res.status(409).json({ error: 'This tenant already has an owner account' });
  }

  const name = parsed.data.name ?? tenant.ownerName;
  const email = (parsed.data.email ?? tenant.ownerEmail)?.trim().toLowerCase();
  if (!name || !email) return res.status(400).json({ error: 'Set the owner name and email on this tenant first' });

  // Login resolves users by bare email, so emails must be unique platform-wide.
  if (await prisma.user.findFirst({ where: { email } })) {
    return res.status(409).json({ error: `${email} is already used by another account` });
  }

  // Unusable random password until the owner sets one with the emailed code.
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const { owner } = await prisma.$transaction((tx) =>
    setUpTenant(tx, {
      tenantId: tenant.id,
      businessName: tenant.name,
      ownerName: name,
      email,
      passwordHash,
      // The invite code proves inbox control when it's redeemed.
      emailVerifiedAt: new Date(),
    }),
  );

  const code = await createOtp(owner.id, 'PASSWORD_RESET', OTP_TTL_MINUTES.INVITE);
  await sendAuthOtp({ tenantId: tenant.id, to: owner.email, name: owner.name, code, purpose: 'INVITE' });
  await logAudit(tenant.id, await actorOf(req), 'OWNER_INVITED', `Created owner account for ${owner.name} (${owner.email}) and sent an invite`, 'MEDIUM', req.ip);

  res.status(201).json({ id: owner.id, name: owner.name, email: owner.email, inviteSent: true });
});

export default router;
