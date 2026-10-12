import type { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { HttpError, tenantIdOf } from '@pospe/permissions';

export const prisma = new PrismaClient();

// A branch lock older than this is treated as abandoned (the device was
// switched off or lost without logging out), so the branch can't be locked
// out forever.
export const LOCK_TTL_MS = 12 * 60 * 60 * 1000;

export interface MobileCtx {
  tenantId: string;
  userId: string;
  storeId: string;
  deviceSerial: string | undefined;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : v != null && typeof v === 'number' ? String(v) : undefined);

/**
 * Who is calling and which branch ("vendor") they act on. The branch is the
 * `vendorId` the app sends as a query/body param; when a call omits it (a few
 * endpoints in the contract do) it falls back to the branch this user has
 * locked, then their assigned store, then the tenant's primary store.
 * Whatever is picked must belong to the caller's tenant.
 */
export async function ctxOf(req: Request): Promise<MobileCtx> {
  const tenantId = tenantIdOf(req);
  const userId = req.authUser?.sub;
  if (!userId || userId === 'system') throw new HttpError(401, 'Missing user context');
  const deviceSerial = (req.authUser as unknown as { dev?: string } | undefined)?.dev;

  const requested = str(req.query.vendorId) ?? str((req.body as Record<string, unknown> | undefined)?.vendorId);
  const store = requested
    ? await prisma.store.findFirst({ where: { id: requested, tenantId, isActive: true }, select: { id: true } })
    : ((await prisma.store.findFirst({ where: { tenantId, lockedByUserId: userId, isActive: true }, select: { id: true } })) ??
      (req.authUser?.storeId ? await prisma.store.findFirst({ where: { id: req.authUser.storeId, tenantId }, select: { id: true } }) : null) ??
      (await prisma.store.findFirst({ where: { tenantId, isPrimary: true }, select: { id: true } })));
  if (!store) throw new HttpError(requested ? 403 : 404, requested ? 'Branch does not belong to your business' : 'No branch configured');
  return { tenantId, userId, storeId: store.id, deviceSerial };
}

/** Stores this user may work in: just their own when assigned one, else every active branch. */
export function storeScope(tenantId: string, assignedStoreId?: string | null) {
  return { tenantId, isActive: true, ...(assignedStoreId ? { id: assignedStoreId } : {}) };
}
