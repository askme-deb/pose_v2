import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma, resolveTenantId } from '../lib/prisma';
import { logAudit } from '../lib/audit';

const router = Router();

const userInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  rbacRoleId: z.string().min(1),
  storeId: z.string().optional(),
  twoFaEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const include = {
  rbacRole: { select: { id: true, title: true } },
  store: { select: { id: true, name: true } },
} as const;

router.get('/users', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const users = await prisma.user.findMany({ where: { tenantId }, include, orderBy: { name: 'asc' } });
  res.json(users);
});

router.post('/users', async (req, res) => {
  const parsed = userInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const actor = (req.body.actorName as string) || 'System Administrator';
  const { name, email, rbacRoleId, storeId, twoFaEnabled, isActive } = parsed.data;

  // No real login/invite flow yet — a random placeholder hash reserves the
  // column so this doesn't silently become a usable "no password" account
  // once real auth is wired up.
  const passwordHash = await bcrypt.hash(`invite-pending-${Date.now()}-${Math.random()}`, 4);

  const user = await prisma.user.create({
    data: {
      tenantId,
      name,
      email,
      rbacRoleId,
      storeId,
      twoFaEnabled: twoFaEnabled ?? true,
      isActive: isActive ?? true,
      role: 'CASHIER',
      passwordHash,
      lastActivityAt: new Date(),
    },
    include,
  });
  await logAudit(tenantId, actor, 'USER_CREATED', `Created user account for ${user.name} (${user.email})`, 'LOW', req.ip);
  res.status(201).json(user);
});

router.put('/users/:id', async (req, res) => {
  const parsed = userInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const actor = (req.body.actorName as string) || 'System Administrator';
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const user = await prisma.user.update({ where: { id: req.params.id }, data: parsed.data, include });
  await logAudit(tenantId, actor, 'USER_REASSIGNED', `Updated role/branch assignment for ${user.name}`, 'LOW', req.ip);
  res.json(user);
});

export default router;
