"use server";

import { createPatient, patientProfileExists, validateNhsNumber } from "@harmony/db";
import { redirect } from "next/navigation";

import { logAuditEvent } from "../../../../../lib/audit-server";
import { getSession } from "../../../../../lib/session";

export type PatientOnboardingData = {
  dateOfBirth: string; // ISO date string from <input type="date">
  gender: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  country: string;
  nhsNumber?: string;
  gpName?: string;
  gpPractice?: string;
  gpAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  medicalAlerts: string[];
  preferredLanguage: string;
  requiresInterpreter: boolean;
};

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

/** UK postcode regex (loose — covers all current formats). */
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

export async function createPatientProfileAction(
  data: PatientOnboardingData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // Guard: don't create a second profile for the same user.
  if (await patientProfileExists(userId)) {
    redirect("/dashboard/patient");
  }

  // Validation
  if (!UK_POSTCODE_RE.test(data.postcode)) {
    return { ok: false, error: "Enter a valid UK postcode." };
  }

  if (data.nhsNumber && !validateNhsNumber(data.nhsNumber)) {
    return { ok: false, error: "Enter a valid 10-digit NHS number." };
  }

  const patient = await createPatient({
    userId,
    dateOfBirth: new Date(data.dateOfBirth),
    gender: data.gender,
    phone: data.phone,
    addressLine1: data.addressLine1,
    ...(data.addressLine2 ? { addressLine2: data.addressLine2 } : {}),
    city: data.city,
    postcode: data.postcode.toUpperCase().replace(/(\S+)\s*(\d)/, "$1 $2"),
    country: data.country,
    ...(data.nhsNumber ? { nhsNumber: data.nhsNumber } : {}),
    ...(data.gpName ? { gpName: data.gpName } : {}),
    ...(data.gpPractice ? { gpPractice: data.gpPractice } : {}),
    ...(data.gpAddress ? { gpAddress: data.gpAddress } : {}),
    ...(data.emergencyContactName ? { emergencyContactName: data.emergencyContactName } : {}),
    ...(data.emergencyContactPhone ? { emergencyContactPhone: data.emergencyContactPhone } : {}),
    ...(data.emergencyContactRelation ? { emergencyContactRelation: data.emergencyContactRelation } : {}),
    medicalAlerts: data.medicalAlerts,
    preferredLanguage: data.preferredLanguage,
    requiresInterpreter: data.requiresInterpreter,
  });

  await logAuditEvent({
    userId,
    action: "PATIENT_PROFILE_CREATED",
    targetId: patient.id,
    targetType: "Patient",
  });

  redirect("/dashboard/patient");
}
