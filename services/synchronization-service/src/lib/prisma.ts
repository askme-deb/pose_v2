import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

const DEFAULT_TENANT_SLUG = 'apex-supermarket';

let cachedDefaultTenantId: string | null = null;
// Keyed by tenantId — every tenant has its own default store, so a single
// shared cache var here would leak tenant A's store id into tenant B's
// requests the moment both had been resolved once in this process.
const cachedDefaultStoreIdByTenant = new Map<string, string>();

// Same fallback convention every other service uses (see e.g.
// sales-service/src/lib/prisma.ts) — explicit x-tenant-id/x-store-id headers
// win, otherwise resolve to the seeded demo tenant/store.
export async function resolveTenantId(headerTenantId?: string): Promise<string> {
  if (headerTenantId) return headerTenantId;
  if (cachedDefaultTenantId) return cachedDefaultTenantId;

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: DEFAULT_TENANT_SLUG } });
  cachedDefaultTenantId = tenant.id;
  return tenant.id;
}

// Falls back to the tenant's primary store (isPrimary: true) rather than a
// hardcoded demo store name — every tenant has exactly one by construction
// (seed.ts for the demo tenant, the self-serve registration flow for every
// other one), so this resolves for any tenant instead of only the one whose
// store happens to be named "Downtown Flagship".
export async function resolveStoreId(tenantId: string, headerStoreId?: string): Promise<string> {
  if (headerStoreId) return headerStoreId;
  const cached = cachedDefaultStoreIdByTenant.get(tenantId);
  if (cached) return cached;

  const store = await prisma.store.findFirstOrThrow({ where: { tenantId, isPrimary: true } });
  cachedDefaultStoreIdByTenant.set(tenantId, store.id);
  return store.id;
}
