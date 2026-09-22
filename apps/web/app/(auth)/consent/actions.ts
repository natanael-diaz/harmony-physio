"use server";

import { CONSENT_VERSION, prisma } from "@harmony/db";
import { redirect } from "next/navigation";

import { auth } from "../../../auth";

/**
 * Record consent for the signed-in user (task 2.6).
 *
 * Writes only the consent fields, and only for the session's own user id —
 * never an id taken from the form, which the client controls.
 */
export async function giveConsentAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      consentGivenAt: new Date(),
      consentVersion: CONSENT_VERSION,
    },
  });

  redirect("/dashboard");
}
