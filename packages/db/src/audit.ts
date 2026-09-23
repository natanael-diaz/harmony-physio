import { prisma as defaultPrisma } from "./index";
import { Prisma } from "@prisma/client";
import type { PrismaClient, AuditLog } from "@prisma/client";

export type LogActionInput = {
  userId: string;
  targetId: string;
  targetType: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// AuditLog is append-only. Never expose update or delete from this module.
// NHS DTAC and GDPR Article 30 require an immutable audit trail.
//
// Each function accepts an optional `prisma` parameter (defaults to the module
// singleton) so callers can inject a test client without hitting a real DB —
// consistent with the DI pattern used in authenticate.ts and verification.ts.
// ---------------------------------------------------------------------------

export async function logAction(
  input: LogActionInput,
  prisma: PrismaClient = defaultPrisma,
): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      targetId: input.targetId,
      targetType: input.targetType,
      action: input.action,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
    },
  });
}

export async function getAuditLogsForTarget(
  targetId: string,
  targetType: string,
  limit = 50,
  prisma: PrismaClient = defaultPrisma,
): Promise<AuditLog[]> {
  return prisma.auditLog.findMany({
    where: { targetId, targetType },
    orderBy: { timestamp: "desc" },
    take: limit,
  });
}

export async function getAuditLogsForActor(
  userId: string,
  limit = 50,
  prisma: PrismaClient = defaultPrisma,
): Promise<AuditLog[]> {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { timestamp: "desc" },
    take: limit,
  });
}
