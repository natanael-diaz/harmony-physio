# API Contract — Harmony Physio Platform

**Project:** Harmony Physio Platform  
**Version:** v1.0  
**Base URL:** `https://harmonyphysio.co.uk/api`  
**Date:** 21 September 2026  
**Auth Mechanism:** JWT session cookie (NextAuth.js v5); bearer token accepted for server-to-server calls.

---

## General Conventions

- All timestamps in **ISO 8601 UTC** format (`2026-09-21T14:30:00Z`).
- Monetary amounts in **pence (integer)** — e.g., `£50.00` is represented as `5000`.
- Currency always GBP.
- Pagination: `limit` (default 20, max 100) + `cursor` (opaque string) or `page` (integer).
- Error shape:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Human-readable message",
      "details": [{ "field": "email", "message": "Invalid email format" }]
    }
  }
  ```
- All 4xx/5xx responses follow this error shape.
- Soft deletes: records are never hard-deleted unless triggered by a GDPR right-to-erasure workflow. Deleted records have `deleted_at` timestamp and are excluded from standard list responses.

### RBAC Roles

| Role | Description |
|---|---|
| `PATIENT` | External patient; access scoped to their own records only |
| `CLINICIAN` | Physiotherapist; read/write access to all patient clinical records |
| `ADMIN` | Receptionist/admin; access to scheduling, billing, patient management |
| `IG_LEAD` | Information Governance lead; audit log access, role management, GDPR workflows |

---

## Route Group: Authentication (`/api/auth/`)

**Auth requirement:** All endpoints in this group are public (unauthenticated) except `/api/auth/me`.  
**Rate limits:** Login and register endpoints are rate-limited to **10 requests per IP per minute** to mitigate brute-force attacks.  
**NHS/GDPR requirements:** All auth events (success, failure, logout) are written to the immutable audit log with user ID, IP address, and timestamp.

---

### POST /api/auth/register

Register a new patient account.

**Auth required:** No  
**Rate limit:** 10 req/IP/min

**Request body:**
```json
{
  "email": "jane.smith@example.com",
  "password": "...",          // min 10 chars; bcrypt hashed server-side
  "firstName": "Jane",
  "lastName": "Smith",
  "dateOfBirth": "1985-04-12",
  "phone": "+447911123456",   // E.164 format; optional
  "privacyNoticeAccepted": true,  // REQUIRED — FR-6.7; must be true
  "privacyNoticeVersion": "v1.0"  // version of notice shown
}
```

**Response `201 Created`:**
```json
{
  "userId": "usr_01J...",
  "email": "jane.smith@example.com",
  "role": "PATIENT",
  "createdAt": "2026-09-21T14:30:00Z"
}
```

**Key validation:**
- `email` — RFC 5321; must be unique in the system.
- `privacyNoticeAccepted` — must be `true`; rejected with `400` if `false` or absent (UK GDPR Article 13 compliance; FR-6.7).
- `dateOfBirth` — ISO 8601 date; patient must be ≥ 16 years old.
- Password is hashed with bcrypt (cost factor 12) before storage; never logged.

**Audit log event:** `AUTH.REGISTER` — userId, email, IP, timestamp.

---

### POST /api/auth/login

Authenticate with email and password (staff) or initiate magic link (patients).

**Auth required:** No  
**Rate limit:** 10 req/IP/min

**Request body (credentials flow):**
```json
{
  "email": "clinician@harmonyphysio.co.uk",
  "password": "...",
  "totpCode": "123456"   // Required for CLINICIAN, ADMIN, IG_LEAD roles
}
```

**Request body (magic link flow):**
```json
{
  "email": "patient@example.com",
  "flow": "magic_link"
}
```

**Response `200 OK` (credentials):**
```json
{
  "userId": "usr_01J...",
  "role": "CLINICIAN",
  "sessionExpiresAt": "2026-09-21T14:45:00Z"
}
```
Session cookie set: `__Secure-next-auth.session-token` (HttpOnly, Secure, SameSite=Strict).

**Response `200 OK` (magic link):**
```json
{
  "message": "Magic link sent to jane.smith@example.com. Link expires in 15 minutes."
}
```

**Error responses:**
- `401` — Invalid credentials or TOTP code.
- `429` — Rate limit exceeded.
- `423` — Account locked after 5 consecutive failures (unlocks after 30 minutes or via IG_LEAD).

**Audit log events:** `AUTH.LOGIN_SUCCESS` / `AUTH.LOGIN_FAILURE` — userId (if resolvable), IP, timestamp.

---

### POST /api/auth/logout

Invalidate the current session.

**Auth required:** Yes (any authenticated role)  
**Rate limit:** Standard (60 req/IP/min)

**Request body:** None

**Response `200 OK`:**
```json
{ "message": "Logged out successfully." }
```
Session cookie cleared.

**Audit log event:** `AUTH.LOGOUT` — userId, IP, timestamp.

---

### POST /api/auth/forgot-password

Initiate password reset by sending a reset link to the registered email.

**Auth required:** No  
**Rate limit:** 5 req/IP/min

**Request body:**
```json
{ "email": "clinician@harmonyphysio.co.uk" }
```

**Response `200 OK`:** (always 200 regardless of whether email exists — prevents user enumeration)
```json
{ "message": "If that email is registered, a reset link has been sent." }
```

Reset link TTL: **1 hour**. Single-use token stored as a hashed value in the database.

---

### POST /api/auth/reset-password

Complete the password reset flow.

**Auth required:** No  
**Rate limit:** 10 req/IP/min

**Request body:**
```json
{
  "token": "otp_01J...",
  "newPassword": "..."
}
```

**Response `200 OK`:**
```json
{ "message": "Password updated successfully." }
```

**Validation:** Token must not be expired or previously used. New password minimum 10 characters.  
**Audit log event:** `AUTH.PASSWORD_RESET` — userId, IP, timestamp.

---

### GET /api/auth/me

Return the authenticated user's profile and role.

**Auth required:** Yes (any role)  
**Rate limit:** Standard

**Response `200 OK`:**
```json
{
  "userId": "usr_01J...",
  "email": "jane.smith@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "PATIENT",
  "mfaEnabled": false,
  "sessionExpiresAt": "2026-09-21T15:00:00Z"
}
```

---

## Route Group: Patients (`/api/patients/`)

**Auth requirement:** All endpoints require authentication.  
**RBAC rule:** `PATIENT` role can only access their own record (`/api/patients/me` pattern enforced). `CLINICIAN`, `ADMIN`, and `IG_LEAD` can access all patient records.  
**NHS/GDPR requirements:** Every read of a patient record generates an `EHR.READ` audit log event (FR-6.2). Patient data responses exclude fields marked `sensitive` from non-clinical roles unless explicitly granted.

---

### GET /api/patients/

List all patients (paginated).

**Auth required:** Yes — `CLINICIAN`, `ADMIN`, `IG_LEAD` only  
**Rate limit:** 30 req/min per user

**Query parameters:**
```
?search=smith          // Optional: full-text search on name/email
&status=ACTIVE         // Optional: ACTIVE | ARCHIVED
&limit=20              // Default 20, max 100
&cursor=eyJpZCI6...    // Cursor-based pagination token
```

**Response `200 OK`:**
```json
{
  "data": [
    {
      "patientId": "pat_01J...",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@example.com",
      "dateOfBirth": "1985-04-12",
      "phone": "+447911123456",
      "status": "ACTIVE",
      "createdAt": "2026-01-15T09:00:00Z",
      "lastAppointmentAt": "2026-09-10T11:00:00Z"
    }
  ],
  "pagination": {
    "nextCursor": "eyJpZCI6...",
    "hasMore": true,
    "total": 142
  }
}
```

**Audit log event:** `PATIENT.LIST` — userId, IP, filter params, record count returned.

---

### GET /api/patients/:patientId

Get a single patient's full profile.

**Auth required:** Yes — `PATIENT` (own record only), `CLINICIAN`, `ADMIN`, `IG_LEAD`  
**Rate limit:** 60 req/min per user

**Response `200 OK`:**
```json
{
  "patientId": "pat_01J...",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "dateOfBirth": "1985-04-12",
  "phone": "+447911123456",
  "address": {
    "line1": "12 Oak Lane",
    "city": "London",
    "postcode": "SW1A 1AA",
    "country": "GB"
  },
  "notificationPreferences": {
    "emailEnabled": true,
    "smsEnabled": true
  },
  "gdpr": {
    "privacyNoticeAccepted": true,
    "privacyNoticeVersion": "v1.0",
    "acceptedAt": "2026-01-15T09:05:00Z",
    "erasureRequestedAt": null
  },
  "status": "ACTIVE",
  "createdAt": "2026-01-15T09:00:00Z"
}
```

**Audit log event:** `PATIENT.READ` — userId, patientId, IP, timestamp.

---

### PATCH /api/patients/:patientId

Update a patient's profile fields (partial update).

**Auth required:** Yes — `PATIENT` (own record, limited fields), `ADMIN`, `IG_LEAD`  
**Rate limit:** 20 req/min per user

**Request body (partial):**
```json
{
  "phone": "+447911999999",
  "address": { "postcode": "EC1A 1BB" },
  "notificationPreferences": { "smsEnabled": false }
}
```

**Restricted fields** (cannot be updated by `PATIENT` role): `email`, `dateOfBirth`, `status`, `gdpr.*`

**Response `200 OK`:** Updated patient object (same shape as GET).

**Audit log event:** `PATIENT.UPDATE` — userId, patientId, changed fields (field names only, not values), IP, timestamp.

---

### GET /api/patients/:patientId/appointments

Get all appointments for a patient.

**Auth required:** Yes — `PATIENT` (own only), `CLINICIAN`, `ADMIN`, `IG_LEAD`  
**Rate limit:** 60 req/min per user

**Query parameters:**
```
?status=UPCOMING|PAST|CANCELLED|ALL   // Default: ALL
&limit=20
&cursor=...
```

**Response `200 OK`:**
```json
{
  "data": [
    {
      "appointmentId": "appt_01J...",
      "type": "TELEHEALTH",
      "status": "CONFIRMED",
      "scheduledAt": "2026-10-01T10:00:00Z",
      "durationMinutes": 45,
      "clinicianName": "Dr. A. Patel",
      "videoSessionUrl": "https://harmonyphysio.co.uk/session/appt_01J..."
    }
  ],
  "pagination": { "nextCursor": null, "hasMore": false, "total": 8 }
}
```

---

### GET /api/patients/:patientId/ehr

Get all EHR records (SOAP notes + documents) for a patient.

**Auth required:** Yes — `PATIENT` (visible notes only, per FR-4.6), `CLINICIAN`, `ADMIN` (read-only), `IG_LEAD`  
**Rate limit:** 30 req/min per user

**Query parameters:**
```
?type=SOAP_NOTE|DOCUMENT|ALL    // Default: ALL
&limit=20
&cursor=...
```

**Response `200 OK`:**
```json
{
  "data": [
    {
      "recordId": "ehr_01J...",
      "type": "SOAP_NOTE",
      "appointmentId": "appt_01J...",
      "createdAt": "2026-09-10T12:30:00Z",
      "author": { "userId": "usr_02J...", "name": "Dr. A. Patel" },
      "visibleToPatient": true,
      "soap": {
        "subjective": "Patient reports...",
        "objective": "ROM assessment...",
        "assessment": "Mild rotator cuff strain...",
        "plan": "Continue physiotherapy 2x/week..."
      }
    },
    {
      "recordId": "ehr_02J...",
      "type": "DOCUMENT",
      "filename": "MRI_report_20260905.pdf",
      "contentType": "application/pdf",
      "sizeBytes": 204800,
      "uploadedAt": "2026-09-06T09:15:00Z",
      "downloadUrl": "https://...(presigned S3 URL, expires 15 min)..."
    }
  ],
  "pagination": { "nextCursor": null, "hasMore": false, "total": 12 }
}
```

**GDPR note:** `PATIENT` role only receives records where `visibleToPatient: true` (FR-4.6). `downloadUrl` is a presigned S3 URL with 15-minute expiry.  
**Audit log event:** `EHR.READ` — userId, patientId, recordIds returned, IP, timestamp.

---

## Route Group: Appointments (`/api/appointments/`)

**Auth requirement:** All endpoints require authentication except public slot availability check.  
**RBAC rule:** `PATIENT` can create appointments and view/cancel their own. `CLINICIAN` and `ADMIN` can view, create, update, and cancel all. `IG_LEAD` has read-only access for audit purposes.  
**Key validation:** Appointment slot must be available; no double-booking on a clinician's calendar.

---

### GET /api/appointments/

List appointments with filters.

**Auth required:** Yes — `CLINICIAN`, `ADMIN`, `IG_LEAD`  
**Rate limit:** 60 req/min per user

**Query parameters:**
```
?clinicianId=usr_02J...    // Filter by clinician
&status=CONFIRMED|CANCELLED|COMPLETED|ALL
&from=2026-10-01           // ISO date
&to=2026-10-31
&type=IN_PERSON|TELEHEALTH|ALL
&limit=50
&cursor=...
```

**Response `200 OK`:**
```json
{
  "data": [
    {
      "appointmentId": "appt_01J...",
      "patientId": "pat_01J...",
      "patientName": "Jane Smith",
      "clinicianId": "usr_02J...",
      "clinicianName": "Dr. A. Patel",
      "type": "TELEHEALTH",
      "status": "CONFIRMED",
      "scheduledAt": "2026-10-01T10:00:00Z",
      "durationMinutes": 45,
      "notes": "Follow-up consultation",
      "createdAt": "2026-09-20T08:00:00Z"
    }
  ],
  "pagination": { "nextCursor": null, "hasMore": false, "total": 24 }
}
```

---

### POST /api/appointments/

Create a new appointment.

**Auth required:** Yes — `PATIENT`, `CLINICIAN`, `ADMIN`  
**Rate limit:** 20 req/min per user

**Request body:**
```json
{
  "patientId": "pat_01J...",      // If PATIENT role: must match their own ID
  "clinicianId": "usr_02J...",
  "type": "TELEHEALTH",           // IN_PERSON | TELEHEALTH
  "scheduledAt": "2026-10-01T10:00:00Z",
  "durationMinutes": 45,
  "notes": "Initial assessment"   // Optional
}
```

**Response `201 Created`:**
```json
{
  "appointmentId": "appt_01J...",
  "patientId": "pat_01J...",
  "clinicianId": "usr_02J...",
  "type": "TELEHEALTH",
  "status": "CONFIRMED",
  "scheduledAt": "2026-10-01T10:00:00Z",
  "durationMinutes": 45,
  "videoSessionUrl": "https://harmonyphysio.co.uk/session/appt_01J...",
  "createdAt": "2026-09-20T08:00:00Z"
}
```

**Side effects:**
- If `type: TELEHEALTH` — Daily.co room created (server-side); `videoSessionUrl` populated.
- Email confirmation sent to patient (FR-1.4).
- SMS reminders scheduled for 24h and 1h before `scheduledAt` (FR-1.5).

**Validation:**
- `scheduledAt` must be a future timestamp.
- Slot must be available (no existing `CONFIRMED` appointment for the clinician overlapping the window).
- `durationMinutes` must be a positive multiple of 15.

---

### GET /api/appointments/:appointmentId

Get a single appointment.

**Auth required:** Yes — `PATIENT` (own only), `CLINICIAN`, `ADMIN`, `IG_LEAD`  
**Rate limit:** 60 req/min per user

**Response `200 OK`:** Full appointment object (same shape as list item, plus any linked SOAP note IDs).

---

### PATCH /api/appointments/:appointmentId

Update an appointment (reschedule or change details).

**Auth required:** Yes — `PATIENT` (reschedule only, within cancellation cut-off window), `CLINICIAN`, `ADMIN`  
**Rate limit:** 20 req/min per user

**Request body (partial):**
```json
{
  "scheduledAt": "2026-10-05T11:00:00Z",
  "notes": "Rescheduled per patient request"
}
```

**Response `200 OK`:** Updated appointment object.

**Side effects:**
- Email notification of reschedule sent to patient (FR-1.4).
- SMS reminders rescheduled.
- If `type: TELEHEALTH` — existing Daily.co room updated with new expiry.

**Validation:** `PATIENT` role can only update `scheduledAt`; cannot change `clinicianId`, `type`, or `status` directly.

---

### DELETE /api/appointments/:appointmentId

Cancel (soft-delete) an appointment.

**Auth required:** Yes — `PATIENT` (own only, subject to cut-off window), `CLINICIAN`, `ADMIN`  
**Rate limit:** 10 req/min per user

**Request body:**
```json
{
  "reason": "Patient cancelled — personal reasons"   // Optional
}
```

**Response `200 OK`:**
```json
{
  "appointmentId": "appt_01J...",
  "status": "CANCELLED",
  "cancelledAt": "2026-09-21T16:00:00Z",
  "cancelledBy": "usr_01J...",
  "reason": "Patient cancelled — personal reasons"
}
```

**Note:** This is a **soft delete** — the appointment record is retained with `status: CANCELLED` for audit and billing purposes (FR-6.2). No hard deletion.

**Side effects:**
- Email cancellation notice sent to patient (FR-1.4).
- If `type: TELEHEALTH` — Daily.co room closed/invalidated.

**Validation:** `PATIENT` role cannot cancel within the configured cut-off window (default: 24 hours before `scheduledAt`; configurable by `ADMIN`).

---

## Route Group: Video (`/api/video/`)

**Auth requirement:** All endpoints require authentication.  
**RBAC rule:** `CLINICIAN` creates and ends sessions. `PATIENT` can retrieve session details for their own appointments. `ADMIN` has read-only access.  
**NHS/GDPR requirements:** Video sessions must be routed via Daily.co EU region only (FR-3.6). Patient names in Daily.co room names use opaque appointment IDs (no PII sent to Daily.co).

---

### POST /api/video/sessions

Create a new video session for an appointment.

**Auth required:** Yes — `CLINICIAN`, `ADMIN`  
**Rate limit:** 20 req/min per user

**Request body:**
```json
{
  "appointmentId": "appt_01J...",
  "expiryMinutes": 90    // Optional; defaults to appointment duration + 30 min buffer
}
```

**Response `201 Created`:**
```json
{
  "sessionId": "vsess_01J...",
  "appointmentId": "appt_01J...",
  "dailyRoomName": "hrm-appt_01J...",     // Opaque; no PII
  "dailyRoomUrl": "https://harmonyphysio.daily.co/hrm-appt_01J...",
  "clinicianToken": "eyJ...",             // Owner token; high-privilege
  "patientToken": "eyJ...",              // Non-owner token; waiting room placement
  "expiresAt": "2026-10-01T11:30:00Z",
  "region": "eu",
  "status": "ACTIVE"
}
```

**Implementation notes:**
- Room created server-side via Daily.co REST API with `geo: "eu"` enforced.
- `clinicianToken` — Daily.co meeting token with `is_owner: true`; grants admit/reject capability.
- `patientToken` — token with `start_video_off: false`; places patient in waiting room until admitted.
- `patientToken` is delivered to the patient via their appointment confirmation email; never exposed in the admin API response.

---

### GET /api/video/sessions/:sessionId

Get details of a video session.

**Auth required:** Yes — `PATIENT` (own appointment sessions only), `CLINICIAN`, `ADMIN`  
**Rate limit:** 60 req/min per user

**Response `200 OK`:**
```json
{
  "sessionId": "vsess_01J...",
  "appointmentId": "appt_01J...",
  "status": "ACTIVE",
  "startedAt": "2026-10-01T10:02:00Z",
  "endedAt": null,
  "region": "eu",
  "expiresAt": "2026-10-01T11:30:00Z"
}
```

**Note:** `clinicianToken` and `patientToken` are **not** returned in GET responses after creation — tokens are single-use delivery items. If a patient needs a new join link, a new session or token should be generated.

---

### POST /api/video/sessions/:sessionId/end

End an active video session.

**Auth required:** Yes — `CLINICIAN`, `ADMIN`  
**Rate limit:** 10 req/min per user

**Request body:** None

**Response `200 OK`:**
```json
{
  "sessionId": "vsess_01J...",
  "status": "ENDED",
  "endedAt": "2026-10-01T10:47:00Z"
}
```

**Side effects:** Calls Daily.co `DELETE /v1/rooms/:roomName` to immediately close the room and eject all participants.  
**Audit log event:** `VIDEO.SESSION_END` — userId, sessionId, appointmentId, IP, timestamp.

---

## Route Group: Payments (`/api/payments/`)

**Auth requirement:** All endpoints require authentication except the Stripe webhook handler.  
**RBAC rule:** `ADMIN` and `IG_LEAD` have full access. `CLINICIAN` has read-only access to payment status. `PATIENT` can view their own payment history.  
**PCI DSS note:** Raw card data never touches the application server. Stripe Elements handles card capture client-side. The server only processes PaymentIntent IDs and webhook events.  
**NHS/GDPR requirements:** Payment records are retained for 7 years for UK tax/VAT compliance. Stripe is a sub-processor listed in the DPA; SCCs in place for UK GDPR data transfer compliance.

---

### POST /api/payments/create-intent

Create a Stripe Payment Intent for an invoice.

**Auth required:** Yes — `ADMIN`, or `PATIENT` (own invoices only)  
**Rate limit:** 20 req/min per user

**Request body:**
```json
{
  "invoiceId": "inv_01J...",
  "returnUrl": "https://harmonyphysio.co.uk/billing/success"   // Required for 3DS redirect flow
}
```

**Response `200 OK`:**
```json
{
  "paymentIntentId": "pi_3...",
  "clientSecret": "pi_3..._secret_...",   // Passed to Stripe.js client-side
  "amount": 5000,                           // Pence
  "currency": "gbp",
  "invoiceId": "inv_01J...",
  "status": "requires_payment_method"
}
```

**Validation:**
- Invoice must exist, belong to the correct patient, and have status `SENT` or `OVERDUE`.
- Invoice must not already have a `PAID` status.
- Amount must match the invoice total.

---

### POST /api/payments/webhook

Stripe webhook handler — receives and processes payment events.

**Auth required:** No (verified via Stripe signature header `stripe-signature`)  
**Rate limit:** Not applicable (Stripe-controlled delivery)

**Stripe signature verification:**
```
stripe.webhooks.constructEvent(rawBody, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)
```

**Handled events:**

| Event | Action |
|---|---|
| `payment_intent.succeeded` | Update invoice status to `PAID`; record `paidAt` timestamp; send payment receipt email to patient |
| `payment_intent.payment_failed` | Update invoice status back to `SENT`; log failure reason; optionally notify admin |
| `charge.refunded` | Create a `REFUND` record; update invoice to `REFUNDED`; audit log entry |

**Response `200 OK`:**
```json
{ "received": true }
```

**Critical:** This endpoint must respond `200` within 30 seconds or Stripe will retry. Long-running operations (email send, etc.) must be queued asynchronously.

**Audit log event:** `PAYMENT.WEBHOOK` — event type, paymentIntentId, invoiceId, amount, timestamp.

---

### GET /api/payments/history

Get payment history.

**Auth required:** Yes — `PATIENT` (own payments only), `ADMIN`, `IG_LEAD`  
**Rate limit:** 30 req/min per user

**Query parameters:**
```
?patientId=pat_01J...    // Required for ADMIN/IG_LEAD; ignored for PATIENT (scoped automatically)
&status=PAID|PENDING|FAILED|REFUNDED|ALL
&from=2026-01-01
&to=2026-12-31
&limit=20
&cursor=...
```

**Response `200 OK`:**
```json
{
  "data": [
    {
      "paymentId": "pay_01J...",
      "invoiceId": "inv_01J...",
      "patientId": "pat_01J...",
      "appointmentId": "appt_01J...",
      "amount": 5000,
      "currency": "gbp",
      "status": "PAID",
      "method": "STRIPE_CARD",    // STRIPE_CARD | MANUAL_CASH | MANUAL_BACS | INSURANCE | NHS_FUNDED
      "stripePaymentIntentId": "pi_3...",
      "paidAt": "2026-09-20T16:30:00Z",
      "invoiceNumber": "INV-2026-0042",
      "description": "Physiotherapy session — 60 min"
    }
  ],
  "pagination": { "nextCursor": null, "hasMore": false, "total": 7 },
  "summary": {
    "totalPaid": 35000,
    "totalOutstanding": 5000,
    "totalOverdue": 0
  }
}
```

---

## Summary: Cross-Cutting Concerns

### Authentication & Session Requirements (All Route Groups)

| Role | MFA Required | Session Timeout | Notes |
|---|---|---|---|
| `PATIENT` | No (magic link is inherently single-use) | 30 min idle | Convenience-focused |
| `CLINICIAN` | Yes — TOTP | 15 min idle | FR-6.6; NHS DTAC security domain |
| `ADMIN` | Yes — TOTP | 15 min idle | FR-6.6 |
| `IG_LEAD` | Yes — TOTP | 15 min idle | Highest privilege |

### GDPR Requirements Per Route Group

| Route Group | Key GDPR Controls |
|---|---|
| Auth | Privacy notice acceptance recorded at registration (FR-6.7); all auth events audit-logged (FR-6.2) |
| Patients | Every record read audit-logged; `PATIENT` role scoped to own data only; right-to-erasure workflow accessible via `PATCH /api/patients/:id` with erasure request flag |
| Appointments | Soft deletes only; audit trail preserved post-cancellation |
| Video | No PII in Daily.co room names; EU region enforced; no recording without explicit consent |
| Payments | Stripe sub-processor listed in DPA; 7-year retention for tax records; card data never server-side |

### Audit Log Event Reference

All audit events are written to an **immutable append-only table** (`audit_events`) with: `eventType`, `userId`, `targetResourceType`, `targetResourceId`, `ipAddress`, `userAgent`, `timestamp`, `metadata` (JSON).

Key event types: `AUTH.*`, `PATIENT.*`, `EHR.*`, `APPOINTMENT.*`, `VIDEO.*`, `PAYMENT.*`, `GDPR.*` (erasure requests, SAR exports, consent changes).

### Rate Limit Summary

| Endpoint Category | Limit |
|---|---|
| Auth (login, register, forgot-password) | 5–10 req/IP/min |
| Standard read endpoints | 60 req/user/min |
| Standard write endpoints | 20 req/user/min |
| Destructive operations (cancel, delete) | 10 req/user/min |
| Stripe webhook | Not rate-limited (Stripe-controlled) |
