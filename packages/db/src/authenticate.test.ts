import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticateCredentials } from "./authenticate";

// Password hashing is mocked so these tests assert the DECISION logic without
// paying ~1s per bcrypt call. Real hashing round-trips are covered in
// auth.test.ts. Mocking also lets us assert the timing-equalisation call, which
// is otherwise invisible.
vi.mock("./auth", () => ({
  verifyPassword: vi.fn(),
  burnPasswordComparison: vi.fn(async () => false as const),
}));

const { verifyPassword, burnPasswordComparison } = await import("./auth");

const NOW = new Date("2026-09-22T12:00:00.000Z");

type UserRow = {
  id: string;
  email: string;
  role: "PATIENT" | "CLINICIAN" | "ADMIN" | "RECEPTIONIST";
  hashedPassword: string;
  deletedAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

function userRow(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "user_1",
    email: "patient@harmony.test",
    role: "PATIENT",
    hashedPassword: "$2a$12$fakehashfakehashfakehashfakehashfakehashfake",
    deletedAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

/** Minimal Prisma stand-in: only the three calls authenticateCredentials makes. */
function fakePrisma(row: UserRow | null, rawResult: unknown[] = []) {
  const update = vi.fn(async () => ({}));
  const queryRaw = vi.fn(async () => rawResult);
  const prisma = {
    user: { findUnique: vi.fn(async () => row), update },
    $queryRaw: queryRaw,
  } as unknown as PrismaClient;
  return { prisma, update, queryRaw };
}

beforeEach(() => {
  vi.mocked(verifyPassword).mockReset();
  vi.mocked(burnPasswordComparison).mockClear();
});

describe("login success", () => {
  it("returns the user and clears the failure counter", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(true);
    const { prisma, update } = fakePrisma(userRow({ failedLoginAttempts: 3 }));

    const result = await authenticateCredentials(
      prisma,
      "patient@harmony.test",
      "Harmony!2026",
      NOW,
    );

    expect(result).toEqual({
      ok: true,
      user: { id: "user_1", email: "patient@harmony.test", role: "PATIENT" },
    });

    // Reset-on-success. Without it, four old typos leave the account one
    // mistake from a lockout indefinitely.
    expect(update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: NOW },
    });
  });

  it("never returns the password hash", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(true);
    const { prisma } = fakePrisma(userRow());

    const result = await authenticateCredentials(prisma, "a@b.test", "pw", NOW);

    // The returned object becomes the JWT payload and then every client
    // session, so a stray hash here leaks to the browser.
    expect(JSON.stringify(result)).not.toContain("$2a$");
    expect(result.ok && "hashedPassword" in result.user).toBe(false);
  });

  it("normalises the email before lookup", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(true);
    const { prisma } = fakePrisma(userRow());

    await authenticateCredentials(prisma, "  PATIENT@Harmony.TEST ", "pw", NOW);

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "patient@harmony.test" } }),
    );
  });
});

describe("wrong password", () => {
  it("is rejected and counted", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    const { prisma, queryRaw } = fakePrisma(userRow(), [
      { failedLoginAttempts: 1, lockedUntil: null },
    ]);

    const result = await authenticateCredentials(prisma, "a@b.test", "nope", NOW);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
    // One statement, not a read-modify-write: concurrent attempts must not all
    // read the same counter and overwrite each other.
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("locks on the fifth consecutive failure", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    const lockedUntil = new Date(NOW.getTime() + 15 * 60 * 1000);
    const { prisma } = fakePrisma(userRow({ failedLoginAttempts: 4 }), [
      { failedLoginAttempts: 5, lockedUntil },
    ]);

    const result = await authenticateCredentials(prisma, "a@b.test", "nope", NOW);

    expect(result).toEqual({ ok: false, reason: "ACCOUNT_LOCKED", unlocksAt: lockedUntil });
  });
});

describe("indistinguishable failure paths", () => {
  it.each([
    ["unknown email", null],
    ["soft-deleted account", userRow({ deletedAt: new Date("2026-01-01") })],
  ])("%s answers exactly as a wrong password does", async (_label, row) => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    const { prisma } = fakePrisma(row as UserRow | null);

    const result = await authenticateCredentials(prisma, "a@b.test", "pw", NOW);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it.each([
    ["unknown email", null],
    ["soft-deleted account", userRow({ deletedAt: new Date("2026-01-01") })],
  ])("%s still burns a comparison, so it costs the same", async (_l, row) => {
    const { prisma } = fakePrisma(row as UserRow | null);

    await authenticateCredentials(prisma, "a@b.test", "pw", NOW);

    // Returning in 1ms where a real check takes ~1s enumerates the patient
    // list just as well as a different error message would.
    expect(burnPasswordComparison).toHaveBeenCalledTimes(1);
  });

  it("does not write to the database for an unknown email", async () => {
    const { prisma, update, queryRaw } = fakePrisma(null);

    await authenticateCredentials(prisma, "nobody@harmony.test", "pw", NOW);

    expect(update).not.toHaveBeenCalled();
    expect(queryRaw).not.toHaveBeenCalled();
  });
});

describe("locked account", () => {
  const lockedUntil = new Date(NOW.getTime() + 60_000);

  it("is rejected without checking the password at all", async () => {
    const { prisma } = fakePrisma(
      userRow({ failedLoginAttempts: 5, lockedUntil }),
    );

    const result = await authenticateCredentials(
      prisma,
      "a@b.test",
      "Harmony!2026",
      NOW,
    );

    expect(result).toEqual({ ok: false, reason: "ACCOUNT_LOCKED", unlocksAt: lockedUntil });
    // The whole point of a lockout: a correct password must not get through,
    // and we must not spend a bcrypt comparison finding that out.
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it("lets a correct password through once the lock has expired", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(true);
    const { prisma, update } = fakePrisma(
      userRow({
        failedLoginAttempts: 5,
        lockedUntil: new Date(NOW.getTime() - 1000),
      }),
    );

    const result = await authenticateCredentials(prisma, "a@b.test", "pw", NOW);

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: null }),
      }),
    );
  });
});
