# Harmony Physio — Technical Tasks: Sprint 1 (Days 1–7)

**Generated:** 2026-09-21  
**Scope:** Monorepo scaffold → working auth → appointment booking MVP  
**Stack:** Next.js 14 App Router · TypeScript strict · Prisma · NextAuth v5 · Tailwind · pnpm + Turborepo · Vitest  
**Compliance constraints:** NHS DTAC, GDPR (ICO), HCPC registration validation

---

## Day 1 — Foundation & CI ✅ (DONE by Tech Lead)

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 1.1 | Monorepo skeleton: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json` | Tech Lead | 1 h | Done |
| 1.2 | `apps/web` Next.js 14 scaffold with Tailwind, App Router, root layout, landing page | Tech Lead | 1 h | Done |
| 1.3 | `packages/ui` — Button + Card components, strict TypeScript | Tech Lead | 1 h | Done |
| 1.4 | `packages/db` — Prisma singleton, full NHS-compliant schema (User, Patient, Clinician, Appointment, EHR, Payment, VideoSession, AuditLog) | DBA Agent + Tech Lead | 1.5 h | Done |
| 1.5 | `packages/types` — Domain enums and interfaces mirroring Prisma schema | Tech Lead | 0.5 h | Done |
| 1.6 | `.github/workflows/ci.yml` — lint + typecheck + test on push/PR | DevOps Agent | 0.5 h | Done |
| 1.7 | `.env.example` with all required vars documented | Tech Lead | 0.25 h | Done |

**Definition of Done (Day 1):** `pnpm install && pnpm typecheck` passes on a clean clone.

---

## Day 2 — Authentication (NextAuth v5)

| # | Task | Owner | Est. |
|---|------|-------|------|
| 2.1 | `apps/web/auth.ts` — NextAuth v5 config, credentials provider, JWT strategy. **No Prisma adapter** — removed 2026-09-22, it requires `User.emailVerified` to be `DateTime?`; do a custom user lookup in `authorize()` instead | Senior Engineer | 2 h |
| 2.2 | `apps/web/middleware.ts` — route protection: `/dashboard/*` requires authenticated session; role-based redirect (PATIENT → `/dashboard/patient`, CLINICIAN → `/dashboard/clinician`) | Senior Engineer | 1 h |
| 2.3 | Login page wired to `signIn()` server action; error states (invalid credentials, account locked) | Senior Engineer | 1 h |
| 2.4 | Password hashing utility (`bcryptjs`, min 12 rounds) + `packages/db/src/auth.ts` helpers | Senior Engineer | 0.5 h |
| 2.5 | Email verification flow: token generation, `sendVerificationEmail` stub (SES integration Day 4) | Senior Engineer | 1 h |
| 2.6 | GDPR consent capture on first login — store `consentGivenAt` + `consentVersion` | Senior Engineer | 0.5 h |
| 2.7 | Auth unit tests (Vitest): login success, invalid credentials, locked account, role redirect | QA Lead | 1 h |

**DoD (Day 2):** A seeded patient user can log in; wrong password shows error; unauthenticated `/dashboard` redirects to `/login`. All auth tests green.

---

## Day 3 — Patient & Clinician Profiles

| # | Task | Owner | Est. |
|---|------|-------|------|
| 3.1 | Patient registration flow: multi-step form (demographics → NHS number → GP details → emergency contact) | Senior Engineer | 3 h |
| 3.2 | Server actions: `createPatient`, `updatePatient` with Zod validation (NHS number format regex: `^\d{3}\s?\d{3}\s?\d{4}$`) | Senior Engineer | 1 h |
| 3.3 | Clinician profile page: HCPC number, specialisations, bio, availability slots | Senior Engineer | 2 h |
| 3.4 | Server actions: `updateClinician`, `setAvailability` | Senior Engineer | 1 h |
| 3.5 | AuditLog middleware: wrap all mutating server actions to write `PATIENT_RECORD_UPDATED`, `CLINICIAN_PROFILE_UPDATED` | Senior Engineer | 1 h |
| 3.6 | Profile page tests: field validation, NHS number format, HCPC validation | QA Lead | 1 h |

**DoD (Day 3):** Patient can complete registration; clinician can update profile. All writes produce AuditLog entries.

---

## Day 4 — Appointment Booking

| # | Task | Owner | Est. |
|---|------|-------|------|
| 4.1 | Availability query: given clinician + date range, return free 60-min slots (exclude booked appointments) | Senior Engineer | 2 h |
| 4.2 | Booking flow UI: clinician selection → date/time picker → appointment type (IN_PERSON / VIDEO / PHONE) → confirmation | Senior Engineer | 3 h |
| 4.3 | Server actions: `createAppointment`, `cancelAppointment`, `rescheduleAppointment` | Senior Engineer | 1.5 h |
| 4.4 | Cancellation policy guard: no same-day cancellation without ADMIN override | Senior Engineer | 0.5 h |
| 4.5 | Email notification stubs: `sendAppointmentConfirmation`, `sendAppointmentReminder` (SES Day 5) | Senior Engineer | 0.5 h |
| 4.6 | Appointment list views: patient upcoming/past, clinician schedule (day/week) | Senior Engineer | 2 h |
| 4.7 | Booking unit + integration tests | QA Lead | 1.5 h |

**DoD (Day 4):** Patient can book, view, and cancel appointments. Clinician sees their schedule.

---

## Day 5 — EHR, Payments, Email

| # | Task | Owner | Est. |
|---|------|-------|------|
| 5.1 | EHR create/update: AES-256-GCM encryption at app layer before Prisma write | Senior Engineer | 2 h |
| 5.2 | EHR version chain: each edit creates new record with `previousVersionId` link | Senior Engineer | 1 h |
| 5.3 | R2 attachment upload: presigned PUT URL (S3-compatible) → store R2 object key in `attachments[]` | DevOps Agent | 1.5 h |
| 5.4 | Stripe payment intent: create on appointment confirmation; webhook handler for `payment_intent.succeeded` / `.payment_failed` | Senior Engineer | 2 h |
| 5.5 | AWS SES integration: send real emails for verification, booking confirmation, reminder (24 h before) | DevOps Agent | 1.5 h |
| 5.6 | Payment + EHR tests | QA Lead | 1 h |

**DoD (Day 5):** EHR is encrypted at rest (verified by reading raw DB row). Payment flow completes end-to-end in Stripe test mode.

---

## Day 6 — Video Consultations (Daily.co)

| # | Task | Owner | Est. |
|---|------|-------|------|
| 6.1 | Daily.co room creation API: `POST /api/video/create-room` — creates room 10 min before appointment | Senior Engineer | 1.5 h |
| 6.2 | Patient-side video join page with Daily.co JS SDK embed | Senior Engineer | 2 h |
| 6.3 | Clinician-side host view with participant management | Senior Engineer | 2 h |
| 6.4 | Recording consent check before enabling `Daily.co` recording | Senior Engineer | 0.5 h |
| 6.5 | VideoSession lifecycle: WAITING → ACTIVE on join, COMPLETED on disconnect | Senior Engineer | 1 h |
| 6.6 | Video join / lifecycle tests (mock Daily.co SDK) | QA Lead | 1 h |

**DoD (Day 6):** VIDEO appointments launch a Daily.co room; session status is tracked; recording only starts with consent.

---

## Day 7 — Admin, Hardening, Deployment

| # | Task | Owner | Est. |
|---|------|-------|------|
| 7.1 | Admin dashboard: user management (deactivate, role change), audit log viewer | Senior Engineer | 2 h |
| 7.2 | Rate limiting: Next.js middleware + `@upstash/ratelimit` on auth + booking endpoints | Senior Engineer | 1 h |
| 7.3 | GDPR right-to-erasure: `DELETE /api/admin/patients/:id/erase` — scrub PII, soft-delete user | Senior Engineer | 1.5 h |
| 7.4 | Dockerfile + `.dockerignore` for `apps/web` (standalone output) | DevOps Agent | 1 h |
| 7.5 | Terraform: RDS PostgreSQL (eu-west-2), Cloudflare R2 bucket (versioned, lifecycle rules), ECS Fargate task | DevOps Agent | 3 h |
| 7.6 | GitHub Actions deploy workflow: push to `main` → build → push ECR → update ECS service | DevOps Agent | 1 h |
| 7.7 | Penetration test surface checklist (OWASP Top 10 review) | Security Engineer | 2 h |
| 7.8 | E2E smoke tests with Playwright: login → book → view EHR | QA Lead | 2 h |

**DoD (Day 7):** App deploys to AWS ECS from CI. E2E smoke tests pass. Security checklist reviewed.

---

## Component Ownership

| Component | Owner | Reviewer |
|-----------|-------|----------|
| Monorepo infra, CI/CD pipeline | Tech Lead + DevOps Agent | —  |
| Next.js App Router, server actions | Senior Engineer | Tech Lead |
| Prisma schema, migrations | DBA Agent | Tech Lead |
| `@harmony/ui` component library | Senior Engineer + UIUX Lead | Tech Lead |
| `@harmony/types` | Tech Lead | Senior Engineer |
| Authentication (NextAuth v5) | Senior Engineer | Tech Lead |
| EHR encryption, AuditLog | Senior Engineer | Security Engineer |
| Stripe payments | Senior Engineer | Tech Lead |
| Daily.co video | Senior Engineer | Tech Lead |
| AWS infrastructure (RDS, ECS), Cloudflare R2 | DevOps Agent | Tech Lead |
| Test suite (Vitest + Playwright) | QA Lead | Tech Lead |

---

## Key Technical Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| NextAuth v5 beta instability | Medium | High | Pin to `5.0.0-beta.19`; monitor release notes; have Prisma adapter fallback plan |
| EHR encryption key management | Low | Critical | Use AWS KMS data-key envelope encryption; never store raw key in env vars |
| Daily.co room quotas / latency | Low | Medium | Pre-create rooms on booking confirmation; EU region (`eu-west-1`) |
| Prisma N+1 on appointment list | Medium | Medium | Use `include` with nested `select`; add `@@index` on hot query fields (done in schema) |
| GDPR erasure breaking EHR audit trail | Low | High | Pseudonymise rather than hard-delete; legal basis documented in privacy policy |
| NHS number validation false positives | Medium | Low | Use Modulus 11 check digit algorithm at app layer, not just regex |
| pnpm lockfile conflicts in monorepo | Medium | Low | Enforce `--frozen-lockfile` in CI; no `npm install` in individual packages |

---

## Definition of Done — Milestone Checklist

### Milestone 1: Runnable scaffold (Day 1)
- [ ] `pnpm install` succeeds on clean clone
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `GET /api/health` returns `{ status: "ok" }`
- [ ] `/` landing page renders
- [ ] `/login` page renders

### Milestone 2: Auth MVP (Day 2)
- [ ] Patient can register and log in
- [ ] Wrong password returns error, no stack trace leaked
- [ ] `/dashboard` redirects to `/login` when unauthenticated
- [ ] Session persists across page reload (JWT cookie)
- [ ] GDPR consent recorded in DB

### Milestone 3: Booking MVP (Day 4)
- [ ] Patient can see available slots for a clinician
- [ ] Patient can book, view, and cancel an appointment
- [ ] Clinician can view their schedule
- [ ] AuditLog row written on every mutation
- [ ] All booking unit tests green

### Milestone 4: Full feature set (Day 6)
- [ ] EHR encrypted at rest (raw DB row unreadable without key)
- [ ] Stripe test payment completes end-to-end
- [ ] VIDEO appointment launches Daily.co room
- [ ] Email notifications sent (Mailhog / SES sandbox)

### Milestone 5: Production-ready (Day 7)
- [ ] App deployed to AWS ECS from `main` branch push
- [ ] E2E smoke tests green in CI
- [ ] OWASP Top 10 checklist reviewed and signed off by Security Engineer
- [ ] Uptime check on `/api/health` configured in AWS Route 53
