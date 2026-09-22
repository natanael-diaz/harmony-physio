import type { Metadata } from "next";

import { auth } from "../../../../auth";

export const metadata: Metadata = {
  title: "Patient dashboard",
};

/**
 * Where middleware sends a PATIENT. Content is Sprint 2 work; this exists so
 * the role redirect has a real destination rather than a 404, and so the
 * session actually proves out end to end.
 */
export default async function PatientDashboardPage() {
  const session = await auth();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Your care</h1>
      <p className="mt-1 text-sm text-slate-500">
        Signed in as {session?.user?.email} ({session?.user?.role})
      </p>
      <p className="mt-6 text-sm text-slate-500">
        Appointments, records and messages arrive in Sprint 2.
      </p>
    </main>
  );
}
