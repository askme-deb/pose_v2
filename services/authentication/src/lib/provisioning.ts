import type { Prisma } from '@prisma/client';
import { DEFAULT_ROLE_DEFS } from './roleTemplates';

export interface TenantSetup {
  tenantId: string;
  businessName: string;
  ownerName: string;
  email: string;
  passwordHash: string;
  phone?: string;
  /** Set when the owner proves their inbox another way (an emailed invite code). */
  emailVerifiedAt?: Date;
}

/**
 * Everything a business needs before anyone can sign in to it: a primary
 * Store, a TenantProfile (checkout's invoice numbering depends on it), the
 * six-role starter kit, and the owner's User. Each piece is only created if
 * it's missing, so this also repairs a tenant that was provisioned without
 * them. Run inside the caller's transaction.
 */
export async function setUpTenant(tx: Prisma.TransactionClient, s: TenantSetup) {
  const store =
    (await tx.store.findFirst({ where: { tenantId: s.tenantId, isPrimary: true } })) ??
    (await tx.store.create({ data: { tenantId: s.tenantId, name: 'Main Store', isPrimary: true, phone: s.phone } }));

  if (!(await tx.tenantProfile.findUnique({ where: { tenantId: s.tenantId } }))) {
    await tx.tenantProfile.create({
      data: { tenantId: s.tenantId, registeredName: s.businessName, supportEmail: s.email, helplinePhone: s.phone },
    });
  }

  const roleIdByCode: Record<string, string> = {};
  const existingRoles = await tx.rbacRole.findMany({ where: { tenantId: s.tenantId }, select: { id: true, code: true } });
  for (const r of existingRoles) roleIdByCode[r.code] = r.id;
  for (const r of DEFAULT_ROLE_DEFS) {
    if (!roleIdByCode[r.code]) roleIdByCode[r.code] = (await tx.rbacRole.create({ data: { tenantId: s.tenantId, ...r } })).id;
  }

  const owner = await tx.user.create({
    data: {
      tenantId: s.tenantId,
      storeId: store.id,
      rbacRoleId: roleIdByCode.ROLE_SUPER_ADMIN,
      name: s.ownerName,
      email: s.email,
      passwordHash: s.passwordHash,
      role: 'TENANT_OWNER',
      isActive: true,
      lastActivityAt: new Date(),
      emailVerifiedAt: s.emailVerifiedAt,
    },
  });

  return { store, owner };
}
