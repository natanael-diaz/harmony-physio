"use server";

import { getClinicianByUserId, upsertClinician } from "@harmony/db";
import type { WeeklyAvailability } from "@harmony/db";

import { logAuditEvent } from "../../../../../lib/audit-server";
import { getSession } from "../../../../../lib/session";

export type ClinicianProfileData = {
  hcpcRegistrationNumber: string;
  bio?: string;
  qualifications?: string;
  specializations: string[];
  availabilitySlots: WeeklyAvailability;
  isActive: boolean;
  acceptingNewPatients: boolean;
};

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function upsertClinicianProfileAction(
  data: ClinicianProfileData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated." };
  if (session.user.role !== "CLINICIAN") return { ok: false, error: "Not authenticated." };
  const userId = session.user.id;

  // Server-side HCPC format validation
  const HCPC_RE = /^[A-Z]{2}\d{6}$/i;
  if (!data.hcpcRegistrationNumber?.trim()) {
    return { ok: false, error: "HCPC registration number is required." };
  }
  if (!HCPC_RE.test(data.hcpcRegistrationNumber.trim())) {
    return { ok: false, error: "HCPC number must be 2 letters followed by 6 digits (e.g. PH123456)." };
  }

  try {
    // Check before upsert only to determine the audit action; the actual
    // write uses Prisma's native upsert (atomic on the userId unique index)
    // so concurrent submissions cannot both succeed as creates.
    const wasNew = !(await getClinicianByUserId(userId));

    const clinician = await upsertClinician(userId, {
      hcpcRegistrationNumber: data.hcpcRegistrationNumber,
      ...(data.bio ? { bio: data.bio } : {}),
      ...(data.qualifications ? { qualifications: data.qualifications } : {}),
      specializations: data.specializations,
      availabilitySlots: data.availabilitySlots,
      isActive: data.isActive,
      acceptingNewPatients: data.acceptingNewPatients,
    });

    await logAuditEvent({
      userId,
      action: wasNew ? "CLINICIAN_PROFILE_CREATED" : "CLINICIAN_PROFILE_UPDATED",
      targetId: clinician.id,
      targetType: "Clinician",
    });

    return { ok: true };
  } catch (err: unknown) {
    // Prisma unique constraint on hcpcRegistrationNumber
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return { ok: false, error: "This HCPC number is already registered." };
    }
    throw err;
  }
}
