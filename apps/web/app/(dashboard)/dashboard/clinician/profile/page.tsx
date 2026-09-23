import type { Metadata } from "next";

import { getClinicianByUserId } from "@harmony/db";
import { requireRole } from "../../../../../lib/require-role";
import { ClinicianProfileForm } from "./clinician-profile-form";
import type { WeeklyAvailability } from "@harmony/db";

export const metadata: Metadata = {
  title: "Your profile — Harmony Physio",
};

export default async function ClinicianProfilePage() {
  const session = await requireRole("CLINICIAN");

  const existing = await getClinicianByUserId(session.user.id);

  const initial: Parameters<typeof ClinicianProfileForm>[0]["initial"] = existing
    ? {
        hcpcRegistrationNumber: existing.hcpcRegistrationNumber,
        ...(existing.bio ? { bio: existing.bio } : {}),
        ...(existing.qualifications ? { qualifications: existing.qualifications } : {}),
        specializations: existing.specializations,
        availabilitySlots: (existing.availabilitySlots ?? {}) as WeeklyAvailability,
        isActive: existing.isActive,
        acceptingNewPatients: existing.acceptingNewPatients,
      }
    : undefined;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-900">
          {existing ? "Edit your profile" : "Set up your profile"}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          {existing
            ? "Keep your details up to date so patients can find you."
            : "Complete your profile before you can be assigned appointments."}
        </p>
      </div>
      <ClinicianProfileForm initial={initial} />
    </main>
  );
}
