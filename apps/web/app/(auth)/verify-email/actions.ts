"use server";

import {
  createVerificationTokenIfCooldownElapsed,
  prisma,
} from "@harmony/db";

import { sendVerificationEmail } from "../../../lib/email";
import { auth } from "../../../auth";

export type ResendState = { sent?: boolean; message?: string };

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

  // Atomically check cooldown and issue a new token inside a serializable
  // transaction so concurrent resend requests cannot both pass the gate.
  const issued = await createVerificationTokenIfCooldownElapsed(prisma, user.email);
  if (!issued) {
    return { message: "Please wait before requesting another link" };
  }

  await sendVerificationEmail(user.email, issued.rawToken);

  return { sent: true };
}
