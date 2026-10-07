import type { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { tenantIdOf } from '@pospe/permissions';

export const prisma = new PrismaClient();

/**
 * The acting tenant for a request: the tenant signed into the caller's
 * access token (see @pospe/permissions' tenantIdOf). Never a client header.
 */
export async function resolveTenantId(req: Request): Promise<string> {
  return tenantIdOf(req);
}
