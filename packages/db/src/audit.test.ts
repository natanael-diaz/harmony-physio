import { describe, expect, it, vi } from "vitest";

import { logAction, getAuditLogsForTarget, getAuditLogsForActor } from "./audit";

function mockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    ...overrides,
  } as unknown as import("@prisma/client").PrismaClient;
}

const BASE_INPUT = {
  userId: "user_1",
  targetId: "target_1",
  targetType: "Patient",
  action: "PATIENT_PROFILE_CREATED",
};

describe("logAction", () => {
  it("passes required fields to prisma.auditLog.create", async () => {
    const prisma = mockPrisma();
    const created = { id: "log_1", ...BASE_INPUT, timestamp: new Date() };
    vi.mocked(prisma.auditLog.create).mockResolvedValue(created as never);

    const result = await logAction(BASE_INPUT, prisma);

    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    const data = vi.mocked(prisma.auditLog.create).mock.calls[0]![0].data;
    expect(data.userId).toBe("user_1");
    expect(data.action).toBe("PATIENT_PROFILE_CREATED");
    expect(result).toBe(created);
  });

  it("maps undefined ipAddress to null", async () => {
    const prisma = mockPrisma();
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    await logAction(BASE_INPUT, prisma);

    const data = vi.mocked(prisma.auditLog.create).mock.calls[0]![0].data;
    expect(data.ipAddress).toBeNull();
  });

  it("passes ipAddress when provided", async () => {
    const prisma = mockPrisma();
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    await logAction({ ...BASE_INPUT, ipAddress: "10.0.0.1" }, prisma);

    const data = vi.mocked(prisma.auditLog.create).mock.calls[0]![0].data;
    expect(data.ipAddress).toBe("10.0.0.1");
  });
});

describe("getAuditLogsForTarget", () => {
  it("queries by targetId and targetType", async () => {
    const prisma = mockPrisma();

    await getAuditLogsForTarget("target_1", "Patient", 10, prisma);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { targetId: "target_1", targetType: "Patient" },
        take: 10,
      }),
    );
  });

  it("defaults limit to 50", async () => {
    const prisma = mockPrisma();

    await getAuditLogsForTarget("target_1", "Patient", undefined, prisma);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });
});

describe("getAuditLogsForActor", () => {
  it("queries by userId", async () => {
    const prisma = mockPrisma();

    await getAuditLogsForActor("user_1", undefined, prisma);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_1" } }),
    );
  });
});
