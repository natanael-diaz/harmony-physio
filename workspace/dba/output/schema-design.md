# Harmony Physio — Database Schema Design Notes

## Stack
- Database: PostgreSQL 15 on AWS RDS eu-west-2
- ORM: Prisma 5.x
- ID strategy: `cuid()` — collision-resistant, URL-safe, sortable

---

## Model-by-Model Rationale

### User
The User model is the central authentication entity. All humans in the system (patients, clinicians, admins, receptionists) share one authentication record. Role-based access control is enforced at the application layer using the `role` enum.

**Soft delete (`deletedAt`)**: Required for GDPR right-to-erasure workflows. When a deletion request is received, PII fields are overwritten (email hashed/anonymised, `hashedPassword` cleared) and `deletedAt` is stamped. The record row is retained for referential integrity (appointments, audit logs cannot have dangling FKs). A scheduled job handles the PII scrub after the statutory retention window.

**GDPR consent fields (`consentGivenAt`, `consentVersion`)**: ICO guidance requires a record of when consent was collected and which version of the privacy notice was presented. These fields satisfy that requirement. `consentVersion` maps to a versioned privacy-notice document stored in the CMS.

**`emailVerifiedAt`**: Added alongside `emailVerified` boolean so the audit trail shows when verification occurred — useful for fraud investigation.

---

### Patient
Extended from User via a strict 1:1 relation. Separation keeps the auth table lean and the clinical table independently queryable.

**NHS Number**: Optional because:
- Walk-in or self-pay patients may not have/provide one at registration.
- Integration with NHS Spine PDS is a Phase 2 feature.
- Unique constraint applied so no duplicate NHS numbers can exist in the system.
- Format validation (10-digit Luhn-verified) is enforced at the application layer, not the database, to keep migration complexity low.

**Gender as `String`**: The NHS Data Dictionary (v3.0) moved away from a binary enum for gender. Free text with a suggested value list in the UI is preferred for inclusivity and future NHS API compatibility.

**`medicalAlerts String[]`**: PostgreSQL native array column. A GIN index (not in Prisma schema directly, add via raw migration) should be created for `@> ARRAY['penicillin']` queries used in clinical safety checks at booking time.

**GP Details**: Required for generating referral letters and for NHS 111 integration. Optional because private self-pay patients may not have a registered GP.

**`preferredLanguage` / `requiresInterpreter`**: Mandated by the Equality Act 2010. NHS DTAC expects these to be captured and acted upon.

---

### Clinician
**`hcpcRegistrationNumber`**: Health and Care Professions Council registration is a legal requirement for physiotherapy practice in the UK. Unique constraint enforced at DB level. The application should validate against the HCPC public register API on clinician onboarding.

**`availabilitySlots Json`**: Stored as a JSON blob (weekly recurring schedule) rather than a relational slots table because:
- The schedule is typically read and written as a whole unit.
- Complex recurring-rule logic (iCal RRULE) is handled in the application layer.
- A separate `AvailabilityOverride` table (date-specific exceptions) can be added in Phase 2 without schema migration.

---

### Appointment
**Composite indexes on `(patientId, scheduledAt)` and `(clinicianId, scheduledAt)`**: The most common query patterns are "show a clinician's diary for a date range" and "show a patient's upcoming appointments" — these indexes serve both without a full scan.

**`cancelledBy` as String (userId)**: Cancellations can originate from patients, clinicians, or reception staff. Storing the userId as a string (rather than a polymorphic FK) keeps the query simple; the full actor record is available in `AuditLog`.

**`notes` field**: Contains clinician consultation notes. Marked for application-layer encryption. Not modelled as a separate EHR record to keep the appointment record self-contained for quick views; full clinical detail goes into `ElectronicHealthRecord`.

---

### ElectronicHealthRecord
**`content` — encrypted at application layer**: Uses AES-256-GCM with a per-record envelope key. The data encryption key (DEK) is stored in AWS Secrets Manager; the key encryption key (KEK) lives in AWS KMS eu-west-2. This satisfies NHS DTAC DSP Toolkit requirement for encryption of clinical data at rest beyond RDS-level encryption.

**`isConfidential`**: Flags records such as mental health assessments, sexual health, or substance misuse notes. Confidential records require an additional RBAC check at the application layer before decryption. Only the treating clinician and authorised admin can access them.

**Versioning (`version`, `previousVersionId`)**: Clinical records must never be silently overwritten. On edit, the existing record is cloned to a new row with `previousVersionId` pointing back, and version incremented. This creates an immutable linked-list audit trail, satisfying NHS Records Management Code of Practice 2021.

**`attachments String[]`**: S3 object keys only — never presigned URLs. The application generates short-lived presigned URLs on demand to avoid URL leakage in logs.

---

### AuditLog
**No `updatedAt`**: Records are append-only. The database role used by the application (`harmony_app`) is granted `INSERT` only on this table — no `UPDATE` or `DELETE`. This is enforced at the PostgreSQL role level, not just application logic.

**`targetType` as String**: Allows logging access to any entity type ("Patient", "ElectronicHealthRecord", "Appointment") without a union FK, which PostgreSQL does not natively support.

**GDPR Article 30**: This table is the processing activity register. The `action` enum-like strings should be drawn from a defined code list (maintained in the application codebase) to ensure consistent categorisation.

---

### Payment
**Amounts in pence (Int)**: Follows Stripe's convention and avoids floating-point rounding issues. £75.00 is stored as `7500`.

**`stripePaymentIntentId` — unique**: Prevents duplicate payment records from webhook retries (idempotency).

**`invoiceNumber`**: Sequential invoice numbers for UK VAT compliance and patient-facing receipts.

---

### VideoSession
**1:1 with Appointment via `appointmentId @unique`**: A video session cannot exist without an appointment.

**`recordingUrl` nullable by design**: Recordings are never stored unless `recordingConsentGiven = true`. This is a hard rule enforced both in application logic and by making the URL field nullable with no default. Consent must be re-confirmed at session start (not just at registration) per ICO guidance on biometric/health data recording.

**`onDelete: Cascade`**: Deleting an appointment cascades to the video session — the only cascade in the schema. All other relations use `Restrict` to prevent accidental data loss.

---

## Fields Requiring Application-Layer Encryption

| Model | Field | Reason |
|-------|-------|--------|
| ElectronicHealthRecord | content | Clinical notes — special category data (GDPR Art. 9) |
| Appointment | notes | Clinician consultation notes |
| Patient | nhsNumber | NHS Pseudonymisation guidelines |
| Patient | dateOfBirth | Special category indicator when combined with clinical data |
| AuditLog | ipAddress | Personal data under GDPR |

RDS storage encryption (AES-256 via AWS KMS) is enabled at the instance level as a baseline. Application-layer encryption for the fields above provides defence-in-depth.

---

## NHS-Specific Field Requirements and Sources

| Field | Source |
|-------|--------|
| nhsNumber | NHS Data Dictionary — Patient Identifier |
| hcpcRegistrationNumber | HCPC Standards of Proficiency for Physiotherapists |
| gpName / gpPractice / gpAddress | NHS GP Connect API data requirements |
| medicalAlerts | NHS Clinical Safety DCB0129 — clinical risk management |
| requiresInterpreter / preferredLanguage | Equality Act 2010, NHS Accessible Information Standard (2016) |
| consentGivenAt / consentVersion | UK GDPR Article 7 and ICO Consent Guidance |
| AuditLog | NHS DTAC DSP Toolkit — Data Security Standard 6 |
| EHR versioning | NHS Records Management Code of Practice 2021 |

---

## GDPR Data Retention Considerations

| Model | Retention Period | Basis |
|-------|-----------------|-------|
| Patient (demographics) | 8 years after last contact; 25 years for minors | NHS Records Management Code of Practice 2021 |
| ElectronicHealthRecord | 8 years minimum; 25 years for paediatric records | NHS Records Management Code 2021 |
| Appointment | 8 years | NHS Records Management Code 2021 |
| AuditLog | 10 years | NHS DTAC DSP Toolkit Std 6 |
| Payment | 7 years | HMRC record-keeping regulations |
| VideoSession (non-recording) | 8 years (metadata only) | Same as appointment |
| VideoSession (recording) | Delete within 30 days unless clinical need documented | ICO guidance on recordings + NHS policy |

A scheduled deletion job should run nightly and hard-delete rows that have exceeded their retention window, after first confirming no active legal holds exist.

---

## Recommended RDS Configuration

| Parameter | Recommendation | Reason |
|-----------|---------------|--------|
| Instance class | db.t4g.medium (dev), db.r6g.large (prod) | r6g gives dedicated memory for connection pooling; Graviton2 cost-efficient |
| Storage | gp3, 100 GB initial, auto-scale to 500 GB | gp3 allows independent IOPS provisioning; avoid gp2 for predictable latency |
| Multi-AZ | Enabled (prod) | Automatic failover; RTO < 60 seconds |
| PostgreSQL version | 15.x | LTS; logical replication support; improved vacuuming |
| Parameter group | `max_connections = 200`, `shared_buffers = 25% RAM`, `work_mem = 16MB` | Tune for Prisma connection pooling (PgBouncer recommended in front) |
| Encryption at rest | aws/rds KMS key | Mandatory for NHS DTAC |
| SSL enforcement | `rds.force_ssl = 1` | All connections TLS 1.2+ |
| Performance Insights | Enabled, 7-day retention | Query-level diagnostics; free tier sufficient |
| Enhanced Monitoring | 60-second granularity | OS-level metrics for RDS |
| Deletion protection | Enabled | Prevent accidental termination |
| IAM DB authentication | Enabled | Avoid static credentials in environment variables long-term |

### PgBouncer (connection pooler)
Deploy PgBouncer on the same EC2/ECS task as the Node.js application, configured in **transaction mode** with `pool_size = 10` per service instance. This prevents PostgreSQL's `max_connections` from being exhausted by Prisma's connection pool.
