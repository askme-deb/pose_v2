import { Router } from 'express';
import { z } from 'zod';
import { prisma, resolveTenantId } from '../lib/prisma';
import { logAudit } from '../lib/audit';

const router = Router();

const permissionSetSchema = z.object({
  view: z.boolean(),
  create: z.boolean(),
  edit: z.boolean(),
  delete: z.boolean(),
  approve: z.boolean(),
  export: z.boolean(),
});

const permissionsSchema = z.object({
  pos: permissionSetSchema,
  inventory: permissionSetSchema,
  finance: permissionSetSchema,
  crm: permissionSetSchema,
});

const roleInput = z.object({
  title: z.string().min(1),
  code: z.string().min(1),
  accessScope: z.string().min(1),
  colorTheme: z.string().optional(),
  description: z.string().optional(),
  permissions: permissionsSchema,
});

// Hardcoded to mirror the seed's system-role defaults — "Reset Matrix" reverts
// each system role to this baseline. Custom (non-system) roles have no
// baseline to revert to, so they're left untouched.
const SYSTEM_ROLE_DEFAULTS: Record<string, z.infer<typeof permissionsSchema>> = {
  ROLE_SUPER_ADMIN: {
    pos: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    inventory: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    finance: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    crm: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
  },
  ROLE_STORE_MGR: {
    pos: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    inventory: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    finance: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    crm: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
  },
  ROLE_CASHIER: {
    pos: { view: true, create: true, edit: true, delete: false, approve: false, export: false },
    inventory: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    crm: { view: true, create: true, edit: false, delete: false, approve: false, export: false },
  },
  ROLE_INVENTORY_LEAD: {
    pos: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
    inventory: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    crm: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  },
  ROLE_FINANCE_AUDITOR: {
    pos: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    inventory: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    finance: { view: true, create: true, edit: false, delete: false, approve: true, export: true },
    crm: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
  },
  ROLE_CRM_SPEC: {
    pos: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
    inventory: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    crm: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
  },
};

router.get('/roles', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const roles = await prisma.rbacRole.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  res.json(roles);
});

router.post('/roles', async (req, res) => {
  const parsed = roleInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const actor = (req.body.actorName as string) || 'System Administrator';

  const role = await prisma.rbacRole.create({
    data: { tenantId, isSystem: false, ...parsed.data },
  });
  await logAudit(tenantId, actor, 'ROLE_CREATED', `Created custom role ${role.title} (${role.code})`, 'LOW', req.ip);
  res.status(201).json(role);
});

router.put('/roles/:id', async (req, res) => {
  const parsed = roleInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const actor = (req.body.actorName as string) || 'System Administrator';
  const existing = await prisma.rbacRole.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Role not found' });

  const role = await prisma.rbacRole.update({ where: { id: req.params.id }, data: parsed.data });
  await logAudit(tenantId, actor, 'ROLE_MODIFIED', `Updated role ${role.title} (${role.code})`, 'MEDIUM', req.ip);
  res.json(role);
});

router.delete('/roles/:id', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const actor = (req.query.actorName as string) || 'System Administrator';
  const existing = await prisma.rbacRole.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Role not found' });
  if (existing.isSystem) return res.status(400).json({ error: 'System critical roles cannot be deleted' });

  await prisma.rbacRole.delete({ where: { id: req.params.id } });
  await logAudit(tenantId, actor, 'ROLE_DELETED', `Removed custom role ${existing.title} (${existing.code})`, 'MEDIUM', req.ip);
  res.status(204).end();
});

router.post('/roles/grant-all-read', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const actor = (req.body.actorName as string) || 'System Administrator';

  const roles = await prisma.rbacRole.findMany({ where: { tenantId } });
  await Promise.all(
    roles.map((r) => {
      const perms = r.permissions as unknown as z.infer<typeof permissionsSchema>;
      const updated = {
        pos: { ...perms.pos, view: true },
        inventory: { ...perms.inventory, view: true },
        finance: { ...perms.finance, view: true },
        crm: { ...perms.crm, view: true },
      };
      return prisma.rbacRole.update({ where: { id: r.id }, data: { permissions: updated } });
    }),
  );
  await logAudit(tenantId, actor, 'MATRIX_BULK_GRANT', 'Granted View access across all roles', 'MEDIUM', req.ip);
  res.json(await prisma.rbacRole.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }));
});

router.post('/roles/reset-matrix', async (req, res) => {
  const tenantId = await resolveTenantId(req.header('x-tenant-id') ?? undefined);
  const actor = (req.body.actorName as string) || 'System Administrator';

  const roles = await prisma.rbacRole.findMany({ where: { tenantId, isSystem: true } });
  await Promise.all(
    roles
      .filter((r) => SYSTEM_ROLE_DEFAULTS[r.code])
      .map((r) => prisma.rbacRole.update({ where: { id: r.id }, data: { permissions: SYSTEM_ROLE_DEFAULTS[r.code] } })),
  );
  await logAudit(tenantId, actor, 'MATRIX_RESET', 'Reset RBAC matrix to system default profiles', 'HIGH', req.ip);
  res.json(await prisma.rbacRole.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }));
});

export default router;
