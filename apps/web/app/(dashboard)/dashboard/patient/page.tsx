import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPatientByUserId } from "@harmony/db";
import { requireRole } from "../../../../lib/require-role";

export const metadata: Metadata = {
  title: "Patient dashboard",
};

export default async function PatientDashboardPage() {
  const session = await requireRole("PATIENT");

  const patient = await getPatientByUserId(session.user.id);
  if (!patient?.phone || !patient.dateOfBirth) {
    redirect("/dashboard/patient/onboarding");
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-ink-900">Your care</h1>
      <p className="mt-1 text-sm text-ink-500">
        Signed in as {session?.user?.email} ({session?.user?.role})
      </p>
      <p className="mt-6 text-sm text-ink-500">
        Appointments, records and messages arrive in Sprint 2.
      </p>
    </main>
  );
}
