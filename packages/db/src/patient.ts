import { prisma } from "./index";
import { Prisma } from "@prisma/client";
import type { Patient } from "@prisma/client";

export type CreatePatientInput = {
  userId: string;
  dateOfBirth: Date;
  gender: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  country?: string;
  nhsNumber?: string;
  gpName?: string;
  gpPractice?: string;
  gpAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  medicalAlerts?: string[];
  preferredLanguage?: string;
  requiresInterpreter?: boolean;
};

export type UpdatePatientInput = Partial<Omit<CreatePatientInput, "userId">>;

export async function createPatient(input: CreatePatientInput): Promise<Patient> {
  return prisma.patient.create({
    data: {
      userId: input.userId,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      phone: input.phone,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 ?? null,
      city: input.city,
      postcode: input.postcode,
      country: input.country ?? "GB",
      nhsNumber: input.nhsNumber ?? null,
      gpName: input.gpName ?? null,
      gpPractice: input.gpPractice ?? null,
      gpAddress: input.gpAddress ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      emergencyContactRelation: input.emergencyContactRelation ?? null,
      medicalAlerts: input.medicalAlerts ?? [],
      preferredLanguage: input.preferredLanguage ?? "en",
      requiresInterpreter: input.requiresInterpreter ?? false,
    },
  });
}

export async function getPatientByUserId(userId: string): Promise<Patient | null> {
  return prisma.patient.findUnique({ where: { userId } });
}

export async function getPatientById(id: string): Promise<Patient | null> {
  return prisma.patient.findUnique({ where: { id } });
}

export async function updatePatient(
  id: string,
  input: UpdatePatientInput,
): Promise<Patient> {
  const data: Prisma.PatientUpdateInput = { ...input };
  return prisma.patient.update({ where: { id }, data });
}

/** Returns true if the user already has a Patient profile. */
export async function patientProfileExists(userId: string): Promise<boolean> {
  const count = await prisma.patient.count({ where: { userId } });
  return count > 0;
}
