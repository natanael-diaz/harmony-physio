// ---------------------------------------------------------------------------
// Email verification tokens (task 2.5)
//
// This is what justified keeping the VerificationToken table when the Prisma
// adapter was dropped; nothing else uses it.
//
// The token in the emailed link is a bearer credential: anyone holding it can
// verify the address. So only a SHA-256 hash is stored, exactly as a password
// reset token would be. A leaked database backup then yields no usable links.
// SHA-256 rather than bcrypt is right here: the token is 256 bits of entropy we
// generated, not a human-chosen secret, so there is nothing to brute force and
// no reason to pay a work factor on every verification.
// ---------------------------------------------------------------------------

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

/** 24 hours. Long enough to survive an email sitting unread overnight, short
 *  enough that a link forwarded or left in an inbox stops working. */
export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function hashVerificationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export type IssuedToken = {
  /** Goes in the email link. Never stored. */
  rawToken: string;
  expires: Date;
};

/**
 * Issue a verification token for an email address.
 *
 * Any outstanding tokens for the address are deleted first: requesting a new
 * link must invalidate the old one, or every link ever sent stays live until it
 * expires on its own.
 */
export async function createVerificationToken(
  prisma: PrismaClient,
  email: string,
  now: Date = new Date(),
): Promise<IssuedToken> {
  const identifier = email.trim().toLowerCase();
  const rawToken = randomBytes(32).toString("base64url");
  const expires = new Date(now.getTime() + VERIFICATION_TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token: hashVerificationToken(rawToken), expires },
    }),
  ]);

  return { rawToken, expires };
}

export type VerificationResult =
  | { ok: true }
  /** One code for wrong, unknown, already-used and expired tokens alike: the
   *  holder of a bad link learns nothing about why it failed. */
  | { ok: false; reason: "INVALID_OR_EXPIRED" };

/**
 * Consume a token and mark the address verified.
 *
 * Single use — the row is deleted whether or not it had expired, so a link
 * cannot be replayed and dead rows do not accumulate.
 */
export async function verifyEmailToken(
  prisma: PrismaClient,
  email: string,
  rawToken: string,
  now: Date = new Date(),
): Promise<VerificationResult> {
  const identifier = email.trim().toLowerCase();
  if (!rawToken) return { ok: false, reason: "INVALID_OR_EXPIRED" };

  const candidate = hashVerificationToken(rawToken);

  const stored = await prisma.verificationToken.findFirst({
    where: { identifier },
  });
  if (!stored) return { ok: false, reason: "INVALID_OR_EXPIRED" };

  // Compared in constant time. The lookup is by identifier, so a plain ===
  // would leak the stored hash a byte at a time to anyone able to measure it.
  if (!constantTimeEquals(stored.token, candidate)) {
    return { ok: false, reason: "INVALID_OR_EXPIRED" };
  }

  // Delete before checking expiry: an expired token is spent either way, and
  // leaving it would let an attacker keep testing it.
  await prisma.verificationToken.deleteMany({ where: { identifier } });

  if (stored.expires.getTime() <= now.getTime()) {
    return { ok: false, reason: "INVALID_OR_EXPIRED" };
  }

  // updateMany, not update: a user deleted between issuing and verifying must
  // not throw, and matching on deletedAt keeps a soft-deleted account from
  // being quietly reactivated.
  await prisma.user.updateMany({
    where: { email: identifier, deletedAt: null },
    data: { emailVerified: true, emailVerifiedAt: now },
  });

  return { ok: true };
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, which would itself be a signal.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
