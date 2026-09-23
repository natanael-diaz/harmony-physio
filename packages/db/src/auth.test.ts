import { describe, expect, it } from "vitest";

import {
  BCRYPT_COST,
  burnPasswordComparison,
  hashPassword,
  verifyPassword,
} from "./auth";

// bcryptjs is pure JS: a cost-12 hash takes roughly a second, so these run well
// over Vitest's 5s default.
const TIMEOUT = 30_000;

describe("password hashing", () => {
  it("meets the cost factor ADR-002 mandates", () => {
    // The mechanical enforcement. A comment tying the seed to the login path
    // was what let these drift silently.
    expect(BCRYPT_COST).toBeGreaterThanOrEqual(12);
  });

  it("round-trips a password and stamps the cost into the hash", async () => {
    const hash = await hashPassword("Harmony!2026");
    // $2a$12$ — if BCRYPT_COST is ever lowered below 12 this fails here too,
    // independently of the constant check above.
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(await verifyPassword("Harmony!2026", hash)).toBe(true);
  }, TIMEOUT);

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("Harmony!2026");
    expect(await verifyPassword("harmony!2026", hash)).toBe(false);
  }, TIMEOUT);

  it("produces a different hash each time (salted)", async () => {
    const [a, b] = await Promise.all([
      hashPassword("Harmony!2026"),
      hashPassword("Harmony!2026"),
    ]);
    expect(a).not.toBe(b);
  }, TIMEOUT);

  it("denies rather than throws on empty or malformed input", async () => {
    await expect(hashPassword("")).rejects.toThrow();
    expect(await verifyPassword("", "")).toBe(false);
    expect(await verifyPassword("x", "not-a-bcrypt-hash")).toBe(false);
  }, TIMEOUT);

  it("burns a comparison for unknown accounts and always returns false", async () => {
    expect(await burnPasswordComparison("anything")).toBe(false);
  }, TIMEOUT);
});
