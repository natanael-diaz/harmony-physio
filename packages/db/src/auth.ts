// ---------------------------------------------------------------------------
// Password hashing (task 2.4)
//
// The single source of truth for the bcrypt cost factor. Import BCRYPT_COST
// from here rather than retyping 12 — a mismatch between the seed and the login
// path is silent, because bcrypt verification succeeds across differing cost
// factors. The only symptom would be an undetected weakening or a latency
// surprise.
//
// ADR-002 mandates cost >= 12 for NHS DTAC, so 12 is a floor, not a default.
// ---------------------------------------------------------------------------

import bcrypt from "bcryptjs";

export const BCRYPT_COST = 12;

/**
 * Hash a plaintext password. Always async — bcryptjs is pure JS, so at cost 12
 * a sync call would block the event loop for roughly a second per request.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  if (!plaintext) {
    throw new Error("hashPassword: refusing to hash an empty password.");
  }
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

/**
 * Verify a plaintext password against a stored hash. Returns false rather than
 * throwing on a malformed hash, so a corrupt row denies access instead of
 * surfacing a 500 that distinguishes it from a wrong password.
 */
export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  if (!plaintext || !hash) return false;
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Timing equalisation for unknown accounts
//
// Without this, an unknown email returns in ~1 ms (no bcrypt call) while a
// wrong password takes ~1 s (a real comparison). That gap alone enumerates the
// patient list, which for a clinical system is a disclosure in its own right.
//
// authorize() must call burnPasswordComparison() on the no-user branch so both
// paths cost the same. Lazily computed and cached: the first call pays for one
// hash, every later call pays only the comparison.
// ---------------------------------------------------------------------------

let dummyHash: Promise<string> | undefined;

export async function burnPasswordComparison(plaintext: string): Promise<false> {
  dummyHash ??= bcrypt.hash("$never-a-real-password$", BCRYPT_COST);
  await bcrypt.compare(plaintext || "x", await dummyHash);
  return false;
}
