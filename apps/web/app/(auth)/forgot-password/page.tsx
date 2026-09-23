import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot password",
};

/**
 * Stub. The sign-in form has linked here since the design phase, so without
 * this page the auth flow contains a 404 — and a locked-out user following
 * "Forgot password?" is exactly the person least able to absorb one.
 *
 * The reset flow itself depends on the email sending that task 2.5 stubs and
 * Day 4 implements.
 */
export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-teal-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-ink-900">Reset your password</h1>
        <p className="mt-3 text-sm text-ink-600">
          Password reset by email is not available yet. Please contact the
          clinic and our team will help you regain access.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-600"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
