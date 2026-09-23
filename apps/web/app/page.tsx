import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome",
};

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-teal-50 px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo placeholder */}
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500 shadow-lg">
          <span className="text-2xl font-bold text-white">H</span>
        </div>

        <h1 className="mb-2 text-3xl font-bold tracking-tight text-ink-900">
          Harmony Physio
        </h1>
        <p className="mb-8 text-ink-600">
          Your physiotherapy clinic portal — book appointments, access your
          health records, and connect with your clinician.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            Sign in
          </Link>
          <Link
            href="/api/health"
            className="inline-flex items-center justify-center rounded-lg border border-ink-200 bg-white px-6 py-3 text-sm font-semibold text-ink-700 shadow-sm transition-colors hover:bg-ink-50"
          >
            System status
          </Link>
        </div>

        <p className="mt-8 text-xs text-ink-400">
          &copy; {new Date().getFullYear()} Harmony Physiotherapy Ltd. Registered in England & Wales.
        </p>
      </div>
    </main>
  );
}
