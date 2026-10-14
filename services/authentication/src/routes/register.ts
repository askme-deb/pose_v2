import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { sendAuthOtp } from '@pospe/notifications';
import { createOtp } from '../lib/otp';
import { setUpTenant } from '../lib/provisioning';

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
// owner's own User. The tenant starts on TRIAL. No session is issued until
// the owner confirms the 6-digit code emailed to them (POST /verify-email),
// so nobody can provision tenants on an address they don't control. No demo
// catalog/customers/invoices get created; this is provisioning, not seeding.
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

  const { tenant, owner } = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: businessName, slug, ownerName, ownerEmail: email, status: 'TRIAL' },
    });

    const { owner } = await setUpTenant(tx, { tenantId: tenant.id, businessName, ownerName, email, passwordHash, phone });

    return { tenant, owner };
  });

  await logAudit(
    tenant.id,
    ownerName,
    'TENANT_REGISTERED',
    `${businessName} signed up for a self-serve trial (slug: ${slug})`,
    'LOW',
    req.ip,
  );

  const code = await createOtp(owner.id, 'EMAIL_VERIFY');
  await sendAuthOtp({ tenantId: tenant.id, to: owner.email, name: owner.name, code, purpose: 'EMAIL_VERIFY' });

  res.status(201).json({ requiresEmailVerification: true, email: owner.email, tenantName: tenant.name });
});

export default router;
