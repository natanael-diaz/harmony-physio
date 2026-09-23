"use server";

import {
  createClinician,
  getClinicianByUserId,
  logAction,
  updateClinician,
} from "@harmony/db";
import type { WeeklyAvailability } from "@harmony/db";
import { headers } from "next/headers";

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

function getClientIp(): string | undefined {
  const hdrs = headers();
  const forwarded = hdrs.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = hdrs.get("x-real-ip");
  return real ?? undefined;
}

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
    const ip = getClientIp();

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
      await logAction({
        userId,
        action: "CLINICIAN_PROFILE_CREATED",
        targetId: clinician.id,
        targetType: "Clinician",
        ...(ip !== undefined ? { ipAddress: ip } : {}),
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
      await logAction({
        userId,
        action: "CLINICIAN_PROFILE_UPDATED",
        targetId: existing.id,
        targetType: "Clinician",
        ...(ip !== undefined ? { ipAddress: ip } : {}),
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
