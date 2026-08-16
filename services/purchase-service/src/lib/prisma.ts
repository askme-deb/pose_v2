import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

const DEFAULT_TENANT_SLUG = 'apex-supermarket';
let cachedDefaultTenantId: string | null = null;

/**
 * Real JWT-based tenant resolution isn't wired up yet (see authentication
 * service), so until then requests are scoped to an explicit `x-tenant-id`
 * header or fall back to the seeded demo tenant.
 */
export async function resolveTenantId(headerTenantId?: string): Promise<string> {
  if (headerTenantId) return headerTenantId;
  if (cachedDefaultTenantId) return cachedDefaultTenantId;

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: DEFAULT_TENANT_SLUG } });
  cachedDefaultTenantId = tenant.id;
  return tenant.id;
}
