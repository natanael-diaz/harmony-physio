import { describe, expect, it } from "vitest";

import {
  LOCKOUT_DURATION_MS,
  LOCKOUT_MAX_ATTEMPTS,
  evaluateLockout,
  lockExpiryFrom,
  shouldLock,
} from "./lockout";

const NOW = new Date("2026-09-22T12:00:00.000Z");
const at = (msFromNow: number) => new Date(NOW.getTime() + msFromNow);

describe("evaluateLockout", () => {
  it("allows a clean account", () => {
    expect(evaluateLockout({ failedLoginAttempts: 0, lockedUntil: null }, NOW))
      .toEqual({ status: "ALLOW", staleCounter: false });
  });

  it("allows while below the threshold", () => {
    expect(evaluateLockout({ failedLoginAttempts: 4, lockedUntil: null }, NOW))
      .toEqual({ status: "ALLOW", staleCounter: false });
  });

  it("rejects while the lock is live", () => {
    const unlocksAt = at(60_000);
    expect(evaluateLockout({ failedLoginAttempts: 5, lockedUntil: unlocksAt }, NOW))
      .toEqual({ status: "LOCKED", unlocksAt });
  });

  it("treats the exact expiry instant as unlocked", () => {
    // Boundary: lockedUntil === now must not still be locked, or a clock that
    // lands precisely on the expiry leaves the user stuck for another tick.
    expect(evaluateLockout({ failedLoginAttempts: 5, lockedUntil: NOW }, NOW).status)
      .toBe("ALLOW");
  });

  it("flags a stale counter once the lock has expired", () => {
    // The regression this exists to prevent: without clearing the counter, the
    // next single failure re-locks immediately.
    expect(evaluateLockout({ failedLoginAttempts: 5, lockedUntil: at(-1) }, NOW))
      .toEqual({ status: "ALLOW", staleCounter: true });
  });

  it("flags a stale counter at the threshold even with no lock recorded", () => {
    expect(evaluateLockout({ failedLoginAttempts: 5, lockedUntil: null }, NOW))
      .toEqual({ status: "ALLOW", staleCounter: true });
  });
});

describe("shouldLock", () => {
  it("locks on the Nth consecutive failure, not before", () => {
    expect(shouldLock(LOCKOUT_MAX_ATTEMPTS - 1)).toBe(false);
    expect(shouldLock(LOCKOUT_MAX_ATTEMPTS)).toBe(true);
    expect(shouldLock(LOCKOUT_MAX_ATTEMPTS + 1)).toBe(true);
  });
});

describe("lockExpiryFrom", () => {
  it("locks for the promised fifteen minutes", () => {
    expect(lockExpiryFrom(NOW).getTime() - NOW.getTime()).toBe(LOCKOUT_DURATION_MS);
    expect(LOCKOUT_DURATION_MS).toBe(15 * 60 * 1000);
  });
});
