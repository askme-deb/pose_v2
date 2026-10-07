import type { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { HttpError, tenantIdOf } from '@pospe/permissions';

export const prisma = new PrismaClient();

// Keyed by `${tenantId}:${storeId}` (validated stores) and by tenantId
// (each tenant's primary store), so one tenant's resolution can never be
// served to another.
const validatedStores = new Set<string>();
const primaryStoreByTenant = new Map<string, string>();

/**
 * The acting tenant for a request: the tenant signed into the caller's
 * access token (see @pospe/permissions' tenantIdOf). Never a client header.
 */
export async function resolveTenantId(req: Request): Promise<string> {
  return tenantIdOf(req);
}

/**
 * The store a request acts on. An explicit x-store-id (a POS terminal's
 * store) is honoured only after checking it belongs to the caller's tenant;
 * otherwise the user's assigned store, otherwise the tenant's primary store.
 */
export async function resolveStoreId(tenantId: string, headerStoreId?: string, assignedStoreId?: string | null): Promise<string> {
  const requested = headerStoreId || assignedStoreId || undefined;
  if (requested) {
    const key = `${tenantId}:${requested}`;
    if (validatedStores.has(key)) return requested;
    const store = await prisma.store.findFirst({ where: { id: requested, tenantId }, select: { id: true } });
    if (!store) throw new HttpError(403, 'Store does not belong to your tenant');
    validatedStores.add(key);
    return requested;
  }

  const cached = primaryStoreByTenant.get(tenantId);
  if (cached) return cached;
  const store = await prisma.store.findFirst({ where: { tenantId, isPrimary: true }, select: { id: true } });
  if (!store) throw new HttpError(404, 'Tenant has no primary store configured');
  primaryStoreByTenant.set(tenantId, store.id);
  return store.id;
}
