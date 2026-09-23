import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireRole } from "../../../../../lib/require-role";
import { getPatientByUserId } from "@harmony/db";
import { PatientOnboardingWizard } from "./patient-onboarding-wizard";

export const metadata: Metadata = {
  title: "Complete your profile — Harmony Physio",
};

export default async function PatientOnboardingPage() {
  const session = await requireRole("PATIENT");

  const existing = await getPatientByUserId(session.user.id);
  if (existing?.phone && existing.dateOfBirth) {
    redirect("/dashboard/patient");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-ink-900">Complete your profile</h1>
        <p className="mt-2 text-sm text-ink-500">
          We need a few details before you can book appointments.
        </p>
      </div>
      <PatientOnboardingWizard />
    </main>
  );
}
