import { prisma } from "./index";
import { Prisma } from "@prisma/client";
import type { Clinician } from "@prisma/client";

export type AvailabilitySlot = { start: string; end: string };
export type WeeklyAvailability = Partial<
  Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", AvailabilitySlot[]>
>;

export type CreateClinicianInput = {
  userId: string;
  hcpcRegistrationNumber: string;
  specializations?: string[];
  bio?: string;
  qualifications?: string;
  availabilitySlots?: WeeklyAvailability;
  acceptingNewPatients?: boolean;
};

export type UpdateClinicianInput = Partial<Omit<CreateClinicianInput, "userId">> & {
  isActive?: boolean;
};

export async function createClinician(input: CreateClinicianInput): Promise<Clinician> {
  return prisma.clinician.create({
    data: {
      userId: input.userId,
      hcpcRegistrationNumber: input.hcpcRegistrationNumber,
      specializations: input.specializations ?? [],
      bio: input.bio ?? null,
      qualifications: input.qualifications ?? null,
      availabilitySlots: input.availabilitySlots ?? Prisma.JsonNull,
      acceptingNewPatients: input.acceptingNewPatients ?? true,
    },
  });
}

export async function getClinicianByUserId(userId: string): Promise<Clinician | null> {
  return prisma.clinician.findUnique({ where: { userId } });
}

export async function getClinicianById(id: string): Promise<Clinician | null> {
  return prisma.clinician.findUnique({ where: { id } });
}

export async function upsertClinician(
  userId: string,
  input: Omit<CreateClinicianInput, "userId"> & { isActive?: boolean },
): Promise<Clinician> {
  const { isActive, ...rest } = input;
  return prisma.clinician.upsert({
    where: { userId },
    create: {
      userId,
      hcpcRegistrationNumber: rest.hcpcRegistrationNumber,
      specializations: rest.specializations ?? [],
      bio: rest.bio ?? null,
      qualifications: rest.qualifications ?? null,
      availabilitySlots: rest.availabilitySlots ?? Prisma.JsonNull,
      acceptingNewPatients: rest.acceptingNewPatients ?? true,
    },
    update: {
      hcpcRegistrationNumber: rest.hcpcRegistrationNumber,
      ...(rest.bio !== undefined ? { bio: rest.bio } : {}),
      ...(rest.qualifications !== undefined ? { qualifications: rest.qualifications } : {}),
      ...(rest.specializations !== undefined ? { specializations: rest.specializations } : {}),
      ...(rest.availabilitySlots !== undefined ? { availabilitySlots: rest.availabilitySlots } : {}),
      ...(rest.acceptingNewPatients !== undefined ? { acceptingNewPatients: rest.acceptingNewPatients } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });
}

export async function updateClinician(
  id: string,
  input: UpdateClinicianInput,
): Promise<Clinician> {
  const data: Prisma.ClinicianUpdateInput = { ...input };
  return prisma.clinician.update({ where: { id }, data });
}

export async function listActiveClinicians(): Promise<Clinician[]> {
  return prisma.clinician.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Returns true if the user already has a Clinician profile. */
export async function clinicianProfileExists(userId: string): Promise<boolean> {
  const count = await prisma.clinician.count({ where: { userId } });
  return count > 0;
}
