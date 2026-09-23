import { prisma, verifyEmailToken } from "@harmony/db";

import { auth } from "../../../auth";
import Link from "next/link";
import type { Metadata } from "next";

import { ResendButton } from "./resend-button";

export const metadata: Metadata = {
  title: "Verify your email",
};

/**
 * Landing page for the link in the verification email (task 2.5).
 *
 * Consuming the token is a side effect on a GET, which is not ideal REST — but
 * it is what a link in an email can do, and the token is single-use and
 * short-lived. The alternative, a button that POSTs, adds a step for every user
 * to guard against link prefetchers, and the cost of a prefetch here is one
 * wasted token and a re-send.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string; email?: string };
}) {
  const { token, email } = searchParams;

  const result =
    token && email
      ? await verifyEmailToken(prisma, email, token)
      : ({ ok: false, reason: "INVALID_OR_EXPIRED" } as const);

  // Resending is scoped to the signed-in user's own address, so it cannot be
  // used to probe which addresses exist or to mail a stranger. A visitor
  // arriving from an email link is usually signed OUT, though, so offering
  // them the button would show "Link sent" while sending nothing.
  const session = await auth();
  const signedIn = session?.user?.id !== undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-teal-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-8 text-center shadow-sm">
        {result.ok ? (
          <>
            <h1 className="text-xl font-bold text-ink-900">
              Email confirmed
            </h1>
            <p className="mt-3 text-sm text-ink-600">
              Thank you — your email address is verified.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-600"
            >
              Continue
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-ink-900">
              This link has expired
            </h1>
            {/* One message for expired, already-used, malformed and unknown
                alike. Distinguishing them tells someone holding a stolen link
                which addresses exist. */}
            <p className="mt-3 text-sm text-ink-600">
              Verification links work once and last 24 hours. Request a new one
              and we will email it to you.
            </p>
            {signedIn ? (
              <ResendButton />
            ) : (
              <Link
                href="/login"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-600"
              >
                Sign in to request a new link
              </Link>
            )}
          </>
        )}
      </div>
    </main>
  );
}
