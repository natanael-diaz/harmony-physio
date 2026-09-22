"use server";

import { createVerificationToken, prisma } from "@harmony/db";

import { sendVerificationEmail } from "../../../lib/email";
import { auth } from "../../../auth";

export type ResendState = { sent?: boolean };

/**
 * Re-send a verification link to the SIGNED-IN user's own address (task 2.5).
 *
 * Deliberately not "resend to whatever address the form supplies": that would
 * be an unauthenticated endpoint that both confirms which addresses exist and
 * lets anyone use us to mail a stranger repeatedly.
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

  const { rawToken } = await createVerificationToken(prisma, user.email);
  await sendVerificationEmail(user.email, rawToken);

  return { sent: true };
}
