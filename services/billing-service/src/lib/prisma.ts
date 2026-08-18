import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

const DEFAULT_TENANT_SLUG = 'apex-supermarket';
const DEFAULT_STORE_NAME = 'Downtown Flagship';

let cachedDefaultTenantId: string | null = null;
let cachedDefaultStoreId: string | null = null;

/**
 * Real JWT-based tenant/store resolution isn't wired up yet (see authentication
 * service), so until then requests are scoped to explicit `x-tenant-id`/`x-store-id`
 * headers or fall back to the seeded demo tenant/store.
 */
export async function resolveTenantId(headerTenantId?: string): Promise<string> {
  if (headerTenantId) return headerTenantId;
  if (cachedDefaultTenantId) return cachedDefaultTenantId;

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: DEFAULT_TENANT_SLUG } });
  cachedDefaultTenantId = tenant.id;
  return tenant.id;
}

export async function resolveStoreId(tenantId: string, headerStoreId?: string): Promise<string> {
  if (headerStoreId) return headerStoreId;
  if (cachedDefaultStoreId) return cachedDefaultStoreId;

  const store = await prisma.store.findFirstOrThrow({ where: { tenantId, name: DEFAULT_STORE_NAME } });
  cachedDefaultStoreId = store.id;
  return store.id;
}
