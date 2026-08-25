import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { roleMap, issueTokens } from '../lib/tokens';
import { DEFAULT_ROLE_DEFS } from '../lib/roleTemplates';

const router = Router();

const registerInput = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  ownerName: z.string().min(2, 'Your name must be at least 2 characters'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
});

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'business';
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

// Self-serve signup: provisions a brand-new Tenant end-to-end in one
// transaction — Tenant, a primary Store, a TenantProfile (checkout's
// invoice-numbering depends on this row existing, not just being optional),
// the same six-role starter kit seed.ts gives every demo tenant, and the
// owner's own User — then logs them straight in with a real session, the
// same tokens /login would issue. No demo catalog/customers/invoices get
// created; this is provisioning, not seeding.
router.post('/register', async (req, res) => {
  const parsed = registerInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { businessName, ownerName, email, password, phone } = parsed.data;

  // Login resolves a user by bare email with no tenant scoping (see
  // routes/auth.ts), so two tenants sharing an owner email would make login
  // nondeterministic — enforce global uniqueness at signup instead.
  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' });
  }

  const slug = await uniqueSlug(slugify(businessName));
  const passwordHash = await bcrypt.hash(password, 10);

  const { tenant, owner, ownerRoleId } = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: businessName, slug, ownerName, ownerEmail: email },
    });

    const store = await tx.store.create({
      data: { tenantId: tenant.id, name: 'Main Store', isPrimary: true, phone },
    });

    await tx.tenantProfile.create({
      data: { tenantId: tenant.id, registeredName: businessName, supportEmail: email, helplinePhone: phone },
    });

    const roleIdByCode: Record<string, string> = {};
    for (const r of DEFAULT_ROLE_DEFS) {
      const role = await tx.rbacRole.create({ data: { tenantId: tenant.id, ...r } });
      roleIdByCode[r.code] = role.id;
    }

    const owner = await tx.user.create({
      data: {
        tenantId: tenant.id,
        storeId: store.id,
        rbacRoleId: roleIdByCode.ROLE_SUPER_ADMIN,
        name: ownerName,
        email,
        passwordHash,
        role: 'TENANT_OWNER',
        isActive: true,
        lastActivityAt: new Date(),
      },
    });

    return { tenant, owner, ownerRoleId: roleIdByCode.ROLE_SUPER_ADMIN };
  });

  await logAudit(
    tenant.id,
    ownerName,
    'TENANT_REGISTERED',
    `${businessName} signed up for a self-serve trial (slug: ${slug})`,
    'LOW',
    req.ip,
  );

  const role = roleMap[owner.role] ?? 'tenant_owner';
  const tokens = issueTokens(owner.id, tenant.id, role, ownerRoleId);
  if (!tokens) {
    return res.status(500).json({ error: 'Server auth configuration is missing JWT secrets' });
  }

  res.status(201).json({
    ...tokens,
    user: {
      id: owner.id,
      name: owner.name,
      email: owner.email,
      role,
      tenantId: tenant.id,
      tenantName: tenant.name,
      rbacRole: { id: ownerRoleId, title: 'Super Administrator', code: 'ROLE_SUPER_ADMIN' },
    },
  });
});

export default router;
