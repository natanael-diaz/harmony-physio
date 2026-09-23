"use server";

import {
  createVerificationToken,
  prisma,
  VERIFICATION_TOKEN_TTL_MS,
} from "@harmony/db";

import { sendVerificationEmail } from "../../../lib/email";
import { auth } from "../../../auth";

export type ResendState = { sent?: boolean; message?: string };

/** Minimum gap between resend requests. Prevents link-spam abuse. */
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

/**
 * Re-send a verification link to the SIGNED-IN user's own address (task 2.5).
 *
 * Deliberately not "resend to whatever address the form supplies": that would
 * be an unauthenticated endpoint that both confirms which addresses exist and
 * lets anyone use us to mail a stranger repeatedly.
 *
 * Rate limit: if a token was issued in the last 60 seconds, return early
 * without creating a new one.  The token's creation time is derived from its
 * `expires` field (expires = createdAt + TTL), avoiding a schema change.
 */
export async function resendVerificationAction(): Promise<ResendState> {
  const session = await auth();

  // Answer identically whether or not there is a session, so the button cannot
  // be used to probe anything.
  if (!session?.user?.id) return { sent: true };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true, deletedAt: true },
  });

  if (!user || user.deletedAt !== null || user.emailVerified) {
    return { sent: true };
  }

  const identifier = user.email.trim().toLowerCase();

  // Check for an existing token to enforce the cooldown.
  const existing = await prisma.verificationToken.findFirst({
    where: { identifier },
    select: { expires: true },
  });

  if (existing) {
    // Derive creation time: createdAt = expires − TTL (TTL is constant).
    const createdAt = new Date(existing.expires.getTime() - VERIFICATION_TOKEN_TTL_MS);
    const elapsed = Date.now() - createdAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      return { message: "Please wait before requesting another link" };
    }
  }

  const { rawToken } = await createVerificationToken(prisma, user.email);
  await sendVerificationEmail(user.email, rawToken);

  return { sent: true };
}
