// ---------------------------------------------------------------------------
// Development seed — Day 2 definition of done: "a seeded patient user can log in".
//
// Creates a PATIENT, a CLINICIAN and an ADMIN, each with a bcrypt-hashed
// password and GDPR consent already recorded, plus the Patient/Clinician profile
// rows the dashboards read. RECEPTIONIST exists in the Role enum but is not
// seeded yet — task 2.2's role redirects will need it.
//
// Re-running refreshes the password, consent and lockout state on the User rows
// (keyed on email). Profile rows are create-only: edits to the Patient/Clinician
// blocks below will NOT apply to an already-seeded database.
//
//   pnpm --filter @harmony/db db:seed
//
// Development only. Passwords here are deliberately well-known. The NODE_ENV
// guard below is weak — NODE_ENV is unset under plain `tsx`, so it fails open.
// Gating on the DATABASE_URL host is still an open decision.
// ---------------------------------------------------------------------------

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Must match the cost factor used by the app's hashing helpers (task 2.4).
const BCRYPT_ROUNDS = 12;

// The consent copy version these users are recorded as having accepted.
const CONSENT_VERSION = "2026-09-01";

const SEED_PASSWORD = "Harmony!2026";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV is production.");
  }

  const hashedPassword = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);
  // Applied in both the create and update branches. The lockout reset is what
  // makes "re-seed to unlock yourself" work after testing the 2.3 error states.
  const consent = {
    consentGivenAt: new Date(),
    consentVersion: CONSENT_VERSION,
    emailVerified: true,
    emailVerifiedAt: new Date(),
    failedLoginAttempts: 0,
    lockedUntil: null,
  };

  // --- Patient -------------------------------------------------------------
  const patientUser = await prisma.user.upsert({
    where: { email: "patient@harmony.test" },
    update: { hashedPassword, ...consent },
    create: {
      email: "patient@harmony.test",
      hashedPassword,
      role: Role.PATIENT,
      ...consent,
    },
  });

  await prisma.patient.upsert({
    where: { userId: patientUser.id },
    update: {},
    create: {
      userId: patientUser.id,
      nhsNumber: "4857773457",
      dateOfBirth: new Date("1988-04-17"),
      gender: "female",
      phone: "07700 900123",
      addressLine1: "12 Peregrine Road",
      city: "Bristol",
      postcode: "BS1 4TR",
      gpName: "Dr Amara Okafor",
      gpPractice: "Redcliffe Medical Practice",
      emergencyContactName: "Sam Whitlock",
      emergencyContactPhone: "07700 900456",
      emergencyContactRelation: "Partner",
      medicalAlerts: ["Latex allergy"],
    },
  });

  // --- Clinician -----------------------------------------------------------
  const clinicianUser = await prisma.user.upsert({
    where: { email: "clinician@harmony.test" },
    update: { hashedPassword, ...consent },
    create: {
      email: "clinician@harmony.test",
      hashedPassword,
      role: Role.CLINICIAN,
      ...consent,
    },
  });

  await prisma.clinician.upsert({
    where: { userId: clinicianUser.id },
    update: {},
    create: {
      userId: clinicianUser.id,
      hcpcRegistrationNumber: "PH123456",
      specializations: ["Musculoskeletal", "Sports injury"],
      bio: "Musculoskeletal physiotherapist with a focus on post-operative knee and shoulder rehabilitation.",
      qualifications: "BSc (Hons) Physiotherapy, MSc Sports Rehabilitation",
      availabilitySlots: {
        mon: [{ start: "09:00", end: "17:00" }],
        tue: [{ start: "09:00", end: "17:00" }],
        wed: [{ start: "09:00", end: "13:00" }],
        thu: [{ start: "09:00", end: "17:00" }],
        fri: [{ start: "09:00", end: "16:00" }],
      },
    },
  });

  // --- Admin ---------------------------------------------------------------
  // No profile row — ADMIN has neither a Patient nor a Clinician extension.
  await prisma.user.upsert({
    where: { email: "admin@harmony.test" },
    update: { hashedPassword, ...consent },
    create: {
      email: "admin@harmony.test",
      hashedPassword,
      role: Role.ADMIN,
      ...consent,
    },
  });

  console.log("Seeded 3 users (password: %s):", SEED_PASSWORD);
  console.log("  patient@harmony.test    PATIENT");
  console.log("  clinician@harmony.test  CLINICIAN");
  console.log("  admin@harmony.test      ADMIN");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
