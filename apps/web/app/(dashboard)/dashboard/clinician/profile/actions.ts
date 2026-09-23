"use server";

import {
  createClinician,
  getClinicianByUserId,
  updateClinician,
} from "@harmony/db";
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
  if (!session?.user?.id) {
    return { ok: false, error: "Not authenticated." };
  }
  const userId = session.user.id;

  try {
    const existing = await getClinicianByUserId(userId);

    if (!existing) {
      const clinician = await createClinician({
        userId,
        hcpcRegistrationNumber: data.hcpcRegistrationNumber,
        ...(data.bio ? { bio: data.bio } : {}),
        ...(data.qualifications ? { qualifications: data.qualifications } : {}),
        specializations: data.specializations,
        availabilitySlots: data.availabilitySlots,
        acceptingNewPatients: data.acceptingNewPatients,
      });
      await logAuditEvent({
        userId,
        action: "CLINICIAN_PROFILE_CREATED",
        targetId: clinician.id,
        targetType: "Clinician",
      });
    } else {
      await updateClinician(existing.id, {
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
        action: "CLINICIAN_PROFILE_UPDATED",
        targetId: existing.id,
        targetType: "Clinician",
      });
    }

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
