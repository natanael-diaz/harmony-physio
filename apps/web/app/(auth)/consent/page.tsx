import { CONSENT_VERSION, needsConsent, prisma } from "@harmony/db";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "../../../auth";
import { giveConsentAction, signOutAction } from "./actions";
import { ConsentForm } from "./consent-form";

export const metadata: Metadata = {
  title: "Privacy and consent",
};

/**
 * First-login consent capture. The dashboard layout redirects here whenever the
 * signed-in user has not accepted the notice currently in force.
 *
 * There is no "decline" button. Declining is not a state this records — it is
 * simply not proceeding, so the alternative offered is signing out. Without
 * that, a user who will not consent is trapped: every dashboard route bounces
 * back here and the only control on the page agrees.
 */
export default async function ConsentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { consentGivenAt: true, consentVersion: true },
  });
  if (!user) redirect("/login");

  // Already consented — don't show a form that would re-stamp the timestamp on
  // an existing, valid record.
  if (!needsConsent(user)) redirect("/dashboard");

  // A returning user re-consenting to an updated notice needs different framing
  // from someone seeing it for the first time.
  const isUpdate = user.consentGivenAt !== null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-teal-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">
          {isUpdate ? "We have updated our privacy notice" : "Before you continue"}
        </h1>

        <p className="mt-3 text-sm text-slate-600">
          {isUpdate
            ? "Our privacy notice has changed since you last agreed to it. Please review and accept the current version to continue."
            : "Harmony Physio holds health information about you. Before you use the portal, please confirm you have read how we handle it."}
        </p>

        <ul className="mt-5 space-y-2 text-sm text-slate-600">
          <li>
            We store your clinical records to provide your care, and keep them
            for the period NHS records retention requires.
          </li>
          <li>
            Only clinicians involved in your care, and administrative staff who
            need it to run your appointments, can see your records.
          </li>
          <li>
            You can ask us for a copy of your data, ask us to correct it, or ask
            us to erase it, at any time.
          </li>
          <li>
            We never sell your data or use it for advertising.
          </li>
        </ul>

        <p className="mt-5 text-sm text-slate-600">
          The full{" "}
          <a href="/privacy" className="text-sky-600 hover:underline">
            privacy notice
          </a>{" "}
          sets this out in detail.
        </p>

        <ConsentForm action={giveConsentAction} />

        <form action={signOutAction}>
          <button
            type="submit"
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Not now — sign out
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Version {CONSENT_VERSION}
        </p>
      </div>
    </main>
  );
}
