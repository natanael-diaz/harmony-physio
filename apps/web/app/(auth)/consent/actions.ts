"use server";

import { CONSENT_VERSION, prisma } from "@harmony/db";
import { redirect } from "next/navigation";

import { auth, signOut } from "../../../auth";

/**
 * Record consent for the signed-in user (task 2.6).
 *
 * Writes only the consent fields, and only for the session's own user id —
 * never an id taken from the form, which the client controls.
 *
 * Idempotency guard: if `consentGivenAt` is already set we skip the UPDATE
 * and go straight to the dashboard. This preserves the original timestamp as
 * required by UK GDPR Art 7(1) evidence requirements — a retry or direct POST
 * must never overwrite the first-consent record.
 */
export async function giveConsentAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { consentGivenAt: true },
  });

  if (!existing?.consentGivenAt) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        consentGivenAt: new Date(),
        consentVersion: CONSENT_VERSION,
      },
    });
  }

  redirect("/dashboard");
}

/**
 * Leave without consenting.
 *
 * The counterpart to the accept button. Declining is not recorded as a state —
 * it is simply ending the session, which is the only honest alternative when
 * every authenticated route requires consent to proceed.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
