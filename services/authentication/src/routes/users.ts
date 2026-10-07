import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import type { UserRole } from '@prisma/client';
import { HttpError, requirePermission } from '@pospe/permissions';
import { sendAuthOtp } from '@pospe/notifications';
import { prisma, resolveTenantId } from '../lib/prisma';
import { logAudit, actorOf } from '../lib/audit';
import { createOtp, OTP_TTL_MINUTES } from '../lib/otp';

const router = Router();

const userInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  rbacRoleId: z.string().min(1),
  storeId: z.string().optional(),
  twoFaEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
  // POS quick-login PIN; null clears it.
  pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits').nullable().optional(),
});

// Never return credential columns (passwordHash, pinHash, twoFaSecret,
// tokenVersion) — this list is readable by every signed-in user.
const select = {
  id: true,
  tenantId: true,
  storeId: true,
  rbacRoleId: true,
  name: true,
  email: true,
  role: true,
  twoFaEnabled: true,
  isActive: true,
  lastActivityAt: true,
  createdAt: true,
  emailVerifiedAt: true,
  pinHash: true,
  rbacRole: { select: { id: true, title: true } },
  store: { select: { id: true, name: true } },
} as const;

type SelectedUser = Awaited<ReturnType<typeof prisma.user.findFirstOrThrow<{ select: typeof select }>>>;

function toPublic({ pinHash, ...user }: SelectedUser) {
  return { ...user, hasPin: Boolean(pinHash) };
}

// The coarse UserRole decides permissions the RBAC matrix can't express
// (user:manage, store:manage), so derive it from the starter-kit role the
// owner picked instead of making every invited user a CASHIER.
const ROLE_BY_RBAC_CODE: Record<string, UserRole> = {
  ROLE_SUPER_ADMIN: 'BRANCH_ADMIN',
  ROLE_STORE_MGR: 'STORE_MANAGER',
  ROLE_CASHIER: 'CASHIER',
  ROLE_INVENTORY_LEAD: 'INVENTORY_MANAGER',
  ROLE_FINANCE_AUDITOR: 'ACCOUNTANT',
  ROLE_CRM_SPEC: 'SALES_EXECUTIVE',
};

async function coarseRoleFor(tenantId: string, rbacRoleId: string): Promise<UserRole> {
  const rbacRole = await prisma.rbacRole.findFirst({ where: { id: rbacRoleId, tenantId } });
  if (!rbacRole) throw new HttpError(400, 'Role not found');
  return ROLE_BY_RBAC_CODE[rbacRole.code] ?? 'CASHIER';
}

async function assertStoreInTenant(tenantId: string, storeId?: string) {
  if (!storeId) return;
  const store = await prisma.store.findFirst({ where: { id: storeId, tenantId } });
  if (!store) throw new HttpError(400, 'Store not found');
}

// PIN login matches a PIN against everyone who can sign in at a store, so
// two such people sharing a PIN would make login ambiguous.
async function assertPinAvailable(tenantId: string, storeId: string | null, pin: string, excludeUserId?: string) {
  const peers = await prisma.user.findMany({
    where: {
      tenantId,
      pinHash: { not: null },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      ...(storeId ? { OR: [{ storeId }, { storeId: null }] } : {}),
    },
    select: { pinHash: true },
  });
  for (const peer of peers) {
    if (peer.pinHash && (await bcrypt.compare(pin, peer.pinHash))) {
      throw new HttpError(409, 'Another staff member at this store already uses that PIN');
    }
  }
}

router.get('/users', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const users = await prisma.user.findMany({ where: { tenantId }, select, orderBy: { name: 'asc' } });
  res.json(users.map(toPublic));
});

router.post('/users', requirePermission('user:manage'), async (req, res) => {
  const parsed = userInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const actor = await actorOf(req);
  const { name, email, rbacRoleId, storeId, twoFaEnabled, isActive, pin } = parsed.data;

  // Login resolves users by bare email, so emails must be unique platform-wide.
  if (await prisma.user.findFirst({ where: { email } })) {
    return res.status(409).json({ error: 'A user with this email already exists' });
  }
  await assertStoreInTenant(tenantId, storeId);
  const role = await coarseRoleFor(tenantId, rbacRoleId);
  if (pin) await assertPinAvailable(tenantId, storeId ?? null, pin);

  // Unusable random password until the invitee sets one with the emailed code.
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

  const user = await prisma.user.create({
    data: {
      tenantId,
      name,
      email,
      rbacRoleId,
      storeId,
      twoFaEnabled: twoFaEnabled ?? false,
      isActive: isActive ?? true,
      role,
      passwordHash,
      pinHash: pin ? await bcrypt.hash(pin, 10) : null,
      // The invite code proves inbox control when it's redeemed.
      emailVerifiedAt: new Date(),
    },
    select,
  });

  const code = await createOtp(user.id, 'PASSWORD_RESET', OTP_TTL_MINUTES.INVITE);
  await sendAuthOtp({ tenantId, to: user.email, name: user.name, code, purpose: 'INVITE' });

  await logAudit(tenantId, actor, 'USER_CREATED', `Invited ${user.name} (${user.email})`, 'LOW', req.ip);
  res.status(201).json(toPublic(user));
});

router.put('/users/:id', requirePermission('user:manage'), async (req, res) => {
  const parsed = userInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const actor = await actorOf(req);
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'User not found' });
  if (existing.role === 'TENANT_OWNER' && parsed.data.isActive === false) {
    return res.status(400).json({ error: 'The business owner account cannot be deactivated' });
  }

  const { pin, email, rbacRoleId, storeId, ...rest } = parsed.data;
  if (email && email !== existing.email && (await prisma.user.findFirst({ where: { email } }))) {
    return res.status(409).json({ error: 'A user with this email already exists' });
  }
  await assertStoreInTenant(tenantId, storeId);
  const role = rbacRoleId && existing.role !== 'TENANT_OWNER' ? await coarseRoleFor(tenantId, rbacRoleId) : undefined;
  if (pin) await assertPinAvailable(tenantId, storeId ?? existing.storeId, pin, existing.id);

  const deactivating = rest.isActive === false && existing.isActive;
  const user = await prisma.user.update({
    where: { id: existing.id },
    data: {
      ...rest,
      ...(email ? { email } : {}),
      ...(rbacRoleId ? { rbacRoleId } : {}),
      ...(storeId !== undefined ? { storeId } : {}),
      ...(role ? { role } : {}),
      ...(pin !== undefined ? { pinHash: pin ? await bcrypt.hash(pin, 10) : null } : {}),
      // Revoke outstanding refresh tokens when access is removed.
      ...(deactivating ? { tokenVersion: { increment: 1 } } : {}),
    },
    select,
  });
  await logAudit(tenantId, actor, deactivating ? 'USER_DEACTIVATED' : 'USER_REASSIGNED', `Updated ${user.name}`, deactivating ? 'MEDIUM' : 'LOW', req.ip);
  res.json(toPublic(user));
});

export default router;
