import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  // Middleware appends ?callbackUrl= when it turns an anonymous visitor away,
  // so signing in returns them to where they were headed. The value is
  // validated in the server action, not trusted from here.
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-teal-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500">
            <span className="text-xl font-bold text-white">H</span>
          </div>
          <h1 className="text-2xl font-bold text-ink-900">Sign in</h1>
          <p className="mt-1 text-sm text-ink-500">
            Harmony Physio patient &amp; clinician portal
          </p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-8 shadow-sm">
          <LoginForm callbackUrl={searchParams.callbackUrl ?? "/dashboard"} />
        </div>

        <p className="mt-6 text-center text-xs text-ink-500">
          By signing in you agree to our{" "}
          <a href="/privacy" className="text-sky-600 hover:underline">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="/terms" className="text-sky-600 hover:underline">
            Terms of Service
          </a>
          .
        </p>
      </div>
    </main>
  );
}
