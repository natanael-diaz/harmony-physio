// ---------------------------------------------------------------------------
// Development seed — Day 2 definition of done: "a seeded patient user can log in".
//
// Creates one user per role, each with a bcrypt-hashed password, plus the
// Patient/Clinician profile rows the dashboards read. All have GDPR consent
// pre-recorded EXCEPT newpatient@harmony.test, which exists to exercise the
// first-login consent gate (task 2.6).
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

import { hashPassword } from "../src/auth";
import { CONSENT_VERSION } from "../src/consent";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Harmony!2026";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV is production.");
  }

  const hashedPassword = await hashPassword(SEED_PASSWORD);
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

  // --- Receptionist --------------------------------------------------------
  // No profile row: RECEPTIONIST has neither a Patient nor a Clinician
  // extension. Exists so task 2.2's role redirect has a fourth case to test.
  await prisma.user.upsert({
    where: { email: "receptionist@harmony.test" },
    update: { hashedPassword, ...consent },
    create: {
      email: "receptionist@harmony.test",
      hashedPassword,
      role: Role.RECEPTIONIST,
      ...consent,
    },
  });

  // --- Patient who has not yet consented ------------------------------------
  // Every other seeded user has consent pre-recorded, which left task 2.6 with
  // no subject: they all skip the flow it builds. This one is deliberately
  // consent-pending and email-unverified, so the first-login gate can actually
  // be exercised.
  //
  // The update branch CLEARS consent rather than leaving it alone, so the
  // fixture survives being used: without it, the first developer to click
  // through the consent screen consumes the only test subject and re-seeding
  // cannot restore it. Clearing is safe in a way that stamping is not — the
  // worst case is asking someone to consent again, whereas writing a
  // consentGivenAt fabricates evidence that a person agreed to something.
  const pendingUser = await prisma.user.upsert({
    where: { email: "newpatient@harmony.test" },
    update: {
      hashedPassword,
      consentGivenAt: null,
      consentVersion: null,
      emailVerified: false,
    },
    create: {
      email: "newpatient@harmony.test",
      hashedPassword,
      role: Role.PATIENT,
      consentGivenAt: null,
      consentVersion: null,
      emailVerified: false,
    },
  });

  await prisma.patient.upsert({
    where: { userId: pendingUser.id },
    update: {},
    create: {
      userId: pendingUser.id,
      dateOfBirth: new Date("1995-11-02"),
      gender: "non-binary",
      phone: "07700 900789",
      addressLine1: "4 Kingsdown Parade",
      city: "Bristol",
      postcode: "BS6 5UD",
      medicalAlerts: [],
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

  console.log("Seeded 5 users (password: %s):", SEED_PASSWORD);
  console.log("  patient@harmony.test       PATIENT");
  console.log("  newpatient@harmony.test    PATIENT     consent pending, email unverified");
  console.log("  clinician@harmony.test     CLINICIAN");
  console.log("  receptionist@harmony.test  RECEPTIONIST");
  console.log("  admin@harmony.test         ADMIN");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
