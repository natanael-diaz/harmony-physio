import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  VERIFICATION_TOKEN_TTL_MS,
  createVerificationToken,
  hashVerificationToken,
  verifyEmailToken,
} from "./verification";

const NOW = new Date("2026-09-22T12:00:00.000Z");

function fakePrisma(stored: { token: string; expires: Date } | null) {
  const userUpdateMany = vi.fn(async () => ({ count: 1 }));
  // tokenDeleteMany is used by createVerificationToken (batch transaction).
  const tokenDeleteMany = vi.fn(async () => ({ count: 1 }));
  // $queryRaw backs the atomic DELETE … RETURNING used by verifyEmailToken.
  // Returns the stored row (if any) so callers can check the token / expiry.
  const queryRaw = vi.fn(async () =>
    stored ? [{ token: stored.token, expires: stored.expires }] : [],
  );
  // Typed parameter so the assertions below can read the arguments; a
  // zero-arity vi.fn() gives .mock.calls an empty tuple type.
  const tokenCreate = vi.fn(
    async (_args: {
      data: { identifier: string; token: string; expires: Date };
    }) => ({}),
  );
  const prisma = {
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === "function") {
        // Interactive transaction — execute the callback with a minimal tx proxy.
        const tx = {
          $queryRaw: queryRaw,
          user: { updateMany: userUpdateMany },
        };
        return (arg as (tx: unknown) => Promise<unknown>)(tx);
      }
      // Batch transaction (array of promises) — the individual mock fns are
      // already invoked when the array is built, so just await them.
      return Promise.all(arg as Promise<unknown>[]);
    }),
    verificationToken: {
      findFirst: vi.fn(async () => stored),
      create: tokenCreate,
      deleteMany: tokenDeleteMany,
    },
    user: { updateMany: userUpdateMany },
  } as unknown as PrismaClient;
  return { prisma, userUpdateMany, tokenDeleteMany, tokenCreate, queryRaw };
}

describe("createVerificationToken", () => {
  it("never stores the raw token", async () => {
    const { prisma, tokenCreate } = fakePrisma(null);

    const { rawToken } = await createVerificationToken(
      prisma,
      "a@harmony.test",
      NOW,
    );

    const written = tokenCreate.mock.calls[0]?.[0];
    // A leaked backup must not yield usable links.
    expect(written?.data.token).not.toBe(rawToken);
    expect(written?.data.token).toBe(hashVerificationToken(rawToken));
  });

  it("issues a distinct high-entropy token each time", async () => {
    const { prisma } = fakePrisma(null);

    const a = await createVerificationToken(prisma, "a@harmony.test", NOW);
    const b = await createVerificationToken(prisma, "a@harmony.test", NOW);

    expect(a.rawToken).not.toBe(b.rawToken);
    // 32 random bytes, base64url encoded.
    expect(a.rawToken.length).toBeGreaterThanOrEqual(42);
  });

  it("expires in 24 hours and normalises the address", async () => {
    const { prisma, tokenCreate } = fakePrisma(null);

    const { expires } = await createVerificationToken(
      prisma,
      "  A@Harmony.TEST ",
      NOW,
    );

    expect(expires.getTime()).toBe(NOW.getTime() + VERIFICATION_TOKEN_TTL_MS);
    const written = tokenCreate.mock.calls[0]?.[0];
    expect(written?.data.identifier).toBe("a@harmony.test");
  });

  it("invalidates outstanding tokens when issuing a new one", async () => {
    const { prisma, tokenDeleteMany } = fakePrisma(null);

    await createVerificationToken(prisma, "a@harmony.test", NOW);

    // Otherwise every link ever sent stays live until its own expiry.
    expect(tokenDeleteMany).toHaveBeenCalledWith({
      where: { identifier: "a@harmony.test" },
    });
  });
});

describe("verifyEmailToken", () => {
  const future = new Date(NOW.getTime() + 60_000);

  it("accepts a valid token and marks the address verified", async () => {
    const raw = "a-valid-raw-token";
    const { prisma, userUpdateMany } = fakePrisma({
      token: hashVerificationToken(raw),
      expires: future,
    });

    const result = await verifyEmailToken(prisma, "a@harmony.test", raw, NOW);

    expect(result).toEqual({ ok: true });
    expect(userUpdateMany).toHaveBeenCalledWith({
      // deletedAt guard: a soft-deleted account must not be reactivated.
      where: { email: "a@harmony.test", deletedAt: null },
      data: { emailVerified: true, emailVerifiedAt: NOW },
    });
  });

  it("consumes the token so it cannot be replayed", async () => {
    const raw = "a-valid-raw-token";
    const { prisma, queryRaw } = fakePrisma({
      token: hashVerificationToken(raw),
      expires: future,
    });

    await verifyEmailToken(prisma, "a@harmony.test", raw, NOW);

    // The atomic DELETE … RETURNING via $queryRaw is the single consume step.
    expect(queryRaw).toHaveBeenCalled();
  });

  it.each([
    ["a wrong token", "not-the-token"],
    ["an empty token", ""],
  ])("rejects %s", async (_label, raw) => {
    const { prisma, userUpdateMany } = fakePrisma({
      token: hashVerificationToken("the-real-one"),
      expires: future,
    });

    const result = await verifyEmailToken(prisma, "a@harmony.test", raw, NOW);

    expect(result).toEqual({ ok: false, reason: "INVALID_OR_EXPIRED" });
    expect(userUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects an expired token and still spends it", async () => {
    const raw = "a-valid-raw-token";
    const { prisma, userUpdateMany, queryRaw } = fakePrisma({
      token: hashVerificationToken(raw),
      expires: new Date(NOW.getTime() - 1),
    });

    const result = await verifyEmailToken(prisma, "a@harmony.test", raw, NOW);

    expect(result).toEqual({ ok: false, reason: "INVALID_OR_EXPIRED" });
    expect(userUpdateMany).not.toHaveBeenCalled();
    // Deleted via the atomic DELETE … RETURNING, so it cannot be probed again.
    expect(queryRaw).toHaveBeenCalled();
  });

  it("does not claim success when no user row was updated", async () => {
    // The account was soft-deleted or removed between issuing the link and
    // clicking it. Saying "Email confirmed" there is a lie.
    const raw = "a-valid-raw-token";
    const { prisma } = fakePrisma({
      token: hashVerificationToken(raw),
      expires: future,
    });
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 });

    expect(await verifyEmailToken(prisma, "a@harmony.test", raw, NOW)).toEqual({
      ok: false,
      reason: "INVALID_OR_EXPIRED",
    });
  });

  it("rejects when no token exists for the address", async () => {
    const { prisma } = fakePrisma(null);

    expect(
      await verifyEmailToken(prisma, "nobody@harmony.test", "anything", NOW),
    ).toEqual({ ok: false, reason: "INVALID_OR_EXPIRED" });
  });

  it("gives one indistinguishable answer to every failure", async () => {
    // Wrong, unknown and expired must be one outcome: the holder of a bad link
    // learns nothing about which addresses exist.
    const wrong = await verifyEmailToken(
      ...([
        fakePrisma({ token: hashVerificationToken("x"), expires: future })
          .prisma,
        "a@harmony.test",
        "y",
        NOW,
      ] as const),
    );
    const unknown = await verifyEmailToken(
      fakePrisma(null).prisma,
      "b@harmony.test",
      "y",
      NOW,
    );
    const expired = await verifyEmailToken(
      fakePrisma({
        token: hashVerificationToken("y"),
        expires: new Date(NOW.getTime() - 1),
      }).prisma,
      "c@harmony.test",
      "y",
      NOW,
    );

    expect(wrong).toEqual(unknown);
    expect(unknown).toEqual(expired);
  });
});
