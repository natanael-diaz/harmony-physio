// ---------------------------------------------------------------------------
// Account lockout policy (backs the failedLoginAttempts / lockedUntil columns)
//
// Kept as a pure function so the policy can be table-tested without a database,
// a clock, or bcrypt. authorize() does the I/O; this decides.
//
// The rule the sign-in copy already promises: five consecutive failures lock the
// account for fifteen minutes.
// ---------------------------------------------------------------------------

export const LOCKOUT_MAX_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export type LockoutState = {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

export type LockoutDecision =
  /** Lock is live. Reject WITHOUT verifying the password. */
  | { status: "LOCKED"; unlocksAt: Date }
  /**
   * Not locked.
   *
   * `staleCounter` reports that a previous lock has expired while the counter
   * is still at the threshold. Clearing it is NOT the caller's job — the
   * increment statement in authenticateCredentials resets the counter in the
   * same UPDATE that observes the expired lock. The flag is exposed for tests
   * and diagnostics; an earlier version of this comment described it as a
   * caller obligation, which was wrong and would have led someone to add a
   * second, racy reset.
   */
  | { status: "ALLOW"; staleCounter: boolean };

export function evaluateLockout(
  state: LockoutState,
  now: Date = new Date(),
): LockoutDecision {
  if (state.lockedUntil && state.lockedUntil.getTime() > now.getTime()) {
    return { status: "LOCKED", unlocksAt: state.lockedUntil };
  }

  // Lock has expired (or never existed). If the counter is still at or above
  // the threshold it is a leftover from that expired lock — without clearing
  // it, one more typo months later locks the account again on the spot.
  const staleCounter =
    state.lockedUntil !== null ||
    state.failedLoginAttempts >= LOCKOUT_MAX_ATTEMPTS;

  return { status: "ALLOW", staleCounter };
}

/** Given the attempt count AFTER an increment, should the account lock now? */
export function shouldLock(attemptsAfterIncrement: number): boolean {
  return attemptsAfterIncrement >= LOCKOUT_MAX_ATTEMPTS;
}

export function lockExpiryFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + LOCKOUT_DURATION_MS);
}
