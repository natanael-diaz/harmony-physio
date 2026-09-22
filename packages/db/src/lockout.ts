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
  /** Not locked. `staleCounter` means a previous lock has expired and the
   *  counter must be cleared before this attempt is counted, otherwise the
   *  next single failure re-locks the account immediately. */
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
