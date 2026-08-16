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
  await prisma.auditLog.create({
    data: { tenantId, actor, eventType, details, riskRating, ipAddress },
  });
}
