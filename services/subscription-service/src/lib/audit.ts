import { prisma } from './prisma';

export type RiskRating = 'LOW' | 'MEDIUM' | 'HIGH';

export async function logAudit(
  tenantId: string,
  actor: string,
  eventType: string,
  details: string,
  riskRating: RiskRating = 'LOW',
  ipAddress?: string,
) {
  await prisma.auditLog.create({ data: { tenantId, actor, eventType, details, riskRating, ipAddress } });
}

/**
 * Who performed an action, for the audit trail: the authenticated user's
 * name from the database — never a client-supplied field, which would let
 * anyone write audit entries in someone else's name.
 */
export async function actorOf(req: { authUser?: { sub: string } }): Promise<string> {
  const sub = req.authUser?.sub;
  if (!sub || sub === 'system') return 'System';
  const user = await prisma.user.findUnique({ where: { id: sub }, select: { name: true } });
  return user?.name ?? 'Unknown user';
}
