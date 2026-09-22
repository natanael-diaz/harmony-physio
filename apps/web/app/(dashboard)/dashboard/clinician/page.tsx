import type { Metadata } from "next";

import { auth } from "../../../../auth";

export const metadata: Metadata = {
  title: "Clinician dashboard",
};

/**
 * Where middleware sends a CLINICIAN. Content is Sprint 2 work; this exists so
 * the role redirect has a real destination rather than a 404, and so the
 * session actually proves out end to end.
 */
export default async function ClinicianDashboardPage() {
  const session = await auth();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Your caseload</h1>
      <p className="mt-1 text-sm text-slate-500">
        Signed in as {session?.user?.email} ({session?.user?.role})
      </p>
      <p className="mt-6 text-sm text-slate-500">
        Your schedule, patient list and notes arrive in Sprint 2.
      </p>
    </main>
  );
}
