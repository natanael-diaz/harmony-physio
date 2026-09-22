// ---------------------------------------------------------------------------
// Credentials authentication (task 2.1)
//
// Lives here rather than inline in authorize() so it can be exercised against a
// real database without standing up NextAuth.
//
// Two rules hold throughout:
//   1. Every failure path returns the SAME shape. The caller must not be able
//      to tell an unknown email from a wrong password from a deleted account.
//   2. Every failure path costs the same wall-clock time. An unknown email that
//      returns in 1 ms while a wrong password takes 1 s enumerates the patient
//      list just as effectively as a different error message would.
// ---------------------------------------------------------------------------

import type { PrismaClient, Role } from "@prisma/client";

import { burnPasswordComparison, verifyPassword } from "./auth";
import {
  LOCKOUT_MAX_ATTEMPTS,
  evaluateLockout,
  lockExpiryFrom,
  shouldLock,
} from "./lockout";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
};

export type AuthResult =
  | { ok: true; user: AuthenticatedUser }
  /** Deliberately undifferentiated: unknown email, wrong password, and soft
   *  deleted all collapse to this. */
  | { ok: false; reason: "INVALID_CREDENTIALS" }
  /** The one case we do disclose, because the user cannot act without it.
   *  See the note below on the enumeration trade-off. */
  | { ok: false; reason: "ACCOUNT_LOCKED"; unlocksAt: Date };

export async function authenticateCredentials(
  prisma: PrismaClient,
  email: string,
  password: string,
  now: Date = new Date(),
): Promise<AuthResult> {
  const normalisedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalisedEmail },
    select: {
      id: true,
      email: true,
      role: true,
      hashedPassword: true,
      deletedAt: true,
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  // No user, or soft-deleted. Burn a comparison so this costs what a real
  // verification costs, then answer exactly as a wrong password would.
  if (!user || user.deletedAt !== null) {
    await burnPasswordComparison(password);
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  const lockout = evaluateLockout(
    { failedLoginAttempts: user.failedLoginAttempts, lockedUntil: user.lockedUntil },
    now,
  );

  if (lockout.status === "LOCKED") {
    // Note we do NOT verify the password here — that is the point of a lockout.
    // It does mean a locked response confirms the account exists. That is a
    // deliberate trade-off: telling a real user "locked for 15 minutes" is the
    // difference between waiting and filing a support ticket. If the threat
    // model later prefers silence, return INVALID_CREDENTIALS here and surface
    // the lock state by email instead.
    return { ok: false, reason: "ACCOUNT_LOCKED", unlocksAt: lockout.unlocksAt };
  }

  const passwordMatches = await verifyPassword(password, user.hashedPassword);

  if (!passwordMatches) {
    const lockedUntil = await recordFailure(prisma, user.id, now);
    if (lockedUntil) {
      return { ok: false, reason: "ACCOUNT_LOCKED", unlocksAt: lockedUntil };
    }
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  // Success clears the counter and any expired lock, and stamps the login.
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now },
  });

  return { ok: true, user: { id: user.id, email: user.email, role: user.role } };
}

/**
 * Increment the failure counter and lock if the threshold is reached, in ONE
 * statement. A read-modify-write would let concurrent requests all read 4 and
 * all write 5 — and credential-stuffing tools fire concurrently by design.
 *
 * Returns the new lock expiry if this failure locked the account.
 */
async function recordFailure(
  prisma: PrismaClient,
  userId: string,
  now: Date,
): Promise<Date | null> {
  const lockExpiry = lockExpiryFrom(now);

  const rows = await prisma.$queryRaw<
    Array<{ failedLoginAttempts: number; lockedUntil: Date | null }>
  >`
    UPDATE "users"
    SET "failedLoginAttempts" = CASE
          WHEN "lockedUntil" IS NOT NULL AND "lockedUntil" <= ${now}
            THEN 1                                  -- expired lock: start over
          ELSE "failedLoginAttempts" + 1
        END,
        "lockedUntil" = CASE
          WHEN "lockedUntil" IS NOT NULL AND "lockedUntil" <= ${now}
            THEN NULL
          WHEN "failedLoginAttempts" + 1 >= ${LOCKOUT_MAX_ATTEMPTS}
            THEN ${lockExpiry}
          ELSE "lockedUntil"
        END
    WHERE "id" = ${userId}
    RETURNING "failedLoginAttempts", "lockedUntil"
  `;

  const updated = rows[0];
  if (!updated) return null;

  return shouldLock(updated.failedLoginAttempts) ? updated.lockedUntil : null;
}
