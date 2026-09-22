// @harmony/types — shared domain types for the Harmony Physio platform
// These mirror the Prisma schema enums/shapes but are framework-agnostic,
// safe to import in both server and client code.

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum UserRole {
  ADMIN = "ADMIN",
  CLINICIAN = "CLINICIAN",
  PATIENT = "PATIENT",
  RECEPTIONIST = "RECEPTIONIST",
}

export enum AppointmentType {
  IN_PERSON = "IN_PERSON",
  VIDEO = "VIDEO",
  PHONE = "PHONE",
}

export enum AppointmentStatus {
  SCHEDULED = "SCHEDULED",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
  NO_SHOW = "NO_SHOW",
  RESCHEDULED = "RESCHEDULED",
}

export enum EhrRecordType {
  ASSESSMENT = "ASSESSMENT",
  TREATMENT_NOTE = "TREATMENT_NOTE",
  DISCHARGE = "DISCHARGE",
  REFERRAL = "REFERRAL",
  PRESCRIPTION = "PRESCRIPTION",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
}

// ---------------------------------------------------------------------------
// Base interfaces
// ---------------------------------------------------------------------------

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface User extends BaseEntity {
  email: string;
  role: UserRole;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  deletedAt: Date | null;
  consentGivenAt: Date | null;
  consentVersion: string | null;
  lastLoginAt: Date | null;
}

/** Safe subset of User safe to expose to client components (no hashed password) */
export type PublicUser = Pick<
  User,
  "id" | "email" | "role" | "emailVerified" | "createdAt"
>;

// ---------------------------------------------------------------------------
// Patient
// ---------------------------------------------------------------------------

export interface Patient extends BaseEntity {
  userId: string;
  nhsNumber: string | null;
  dateOfBirth: Date;
  gender: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postcode: string;
  country: string;
  gpName: string | null;
  gpPractice: string | null;
  gpAddress: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  medicalAlerts: string[];
  preferredLanguage: string;
  requiresInterpreter: boolean;
}

// ---------------------------------------------------------------------------
// Clinician
// ---------------------------------------------------------------------------

export interface Clinician extends BaseEntity {
  userId: string;
  hcpcRegistrationNumber: string;
  specializations: string[];
  bio: string | null;
  qualifications: string | null;
  availabilitySlots: Record<string, Array<{ start: string; end: string }>> | null;
  isActive: boolean;
  acceptingNewPatients: boolean;
}

// ---------------------------------------------------------------------------
// Appointment
// ---------------------------------------------------------------------------

export interface Appointment extends BaseEntity {
  patientId: string;
  clinicianId: string;
  scheduledAt: Date;
  durationMinutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  cancellationReason: string | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  notes: string | null;
  patientNotes: string | null;
  reminderSentAt: Date | null;
  confirmationSentAt: Date | null;
}

/** Appointment with joined patient and clinician display data */
export interface AppointmentWithRelations extends Appointment {
  patient: Pick<Patient, "id"> & { user: PublicUser };
  clinician: Pick<Clinician, "id" | "specializations"> & { user: PublicUser };
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
