# Architecture Decision Records — Harmony Physio Platform

**Project:** Harmony Physio Platform  
**Client:** Harmony Physiotherapy Clinic (harmonyphysio.co.uk)  
**Vendor:** Kontra Digital  
**Date:** 21 September 2026  
**Status:** Draft v1.0

---

## ADR-001: Monorepo Structure

**Status:** Accepted  
**Date:** 21 September 2026

### Context

The Harmony Physio Platform is developed by a single small team (Kontra Digital) and comprises a Next.js frontend, a Next.js API layer (Route Handlers / API Routes), and shared TypeScript types that span both the patient-facing UI and the clinical admin interface. A key requirement is fast CI turnaround within a 21-day delivery window and maintainable code sharing — especially for data models (patients, appointments, SOAP notes, invoices) and validation schemas that must be consistent between the API and frontend.

### Decision

Use a **pnpm workspaces + Turborepo monorepo** with the following package structure:

```
harmony-physio/
  apps/
    web/          # Next.js app (frontend + API routes)
  packages/
    types/        # Shared TypeScript interfaces and Zod schemas
    ui/           # Shared React component library (design system)
    config/       # Shared ESLint, TypeScript, Tailwind configs
    db/           # Prisma schema + generated client
  turbo.json
  pnpm-workspace.yaml
```

### Alternatives Considered

| Option | Reason Rejected |
|---|---|
| **Nx** | Heavier configuration overhead; more opinionated; overkill for a team of 1–2 developers; plugin ecosystem adds complexity without benefit at this scale |
| **Separate repositories** | Would require publishing `types` package to a registry (npm/GitHub Packages) even for internal use; broken circular dependency between frontend and API types; no shared lint/config enforcement |
| **Lerna** | Largely superseded by pnpm workspaces for dependency management; Turborepo provides better remote caching and pipeline orchestration |
| **Single Next.js app (no monorepo)** | Viable but creates a flat structure that becomes hard to maintain if the platform grows to include a mobile app or a separate admin SPA; doesn't allow clean separation of the Prisma DB layer |

### Consequences

**Positive:**
- Single `pnpm install` bootstraps the full stack; new developers onboard in minutes.
- Turborepo's task pipeline (`build`, `test`, `lint`) runs only affected packages on each commit — critical for fast CI in a 21-day timeline.
- Turborepo remote caching (Vercel-hosted or self-hosted) eliminates redundant rebuilds in CI.
- Shared `packages/types` guarantees the API response shape and the frontend's TypeScript types are always in sync — eliminates a whole class of runtime type mismatches.
- Shared `packages/db` (Prisma) means migrations are version-controlled alongside application code with no divergence risk.
- Shared `packages/config` enforces consistent ESLint, TypeScript strict mode, and Tailwind config across all packages.

**Negative:**
- `pnpm` must be used consistently — mixing `npm` or `yarn` commands will corrupt the workspace symlinks.
- Turborepo cache invalidation rules (`inputs`/`outputs` in `turbo.json`) require upfront configuration; incorrect configuration leads to stale cache hits.
- All packages share a single `node_modules` hoist, which can create version conflicts if two packages require incompatible peer dependency versions.
- Git history is not cleanly separable by service if the project ever needs to be split into separate repos.

---

## ADR-002: Authentication Strategy

**Status:** Accepted  
**Date:** 21 September 2026

### Context

The platform handles Special Category data under UK GDPR Article 9 (health data). NHS DTAC explicitly mandates secure authentication controls, including protection against credential stuffing and phishing. The platform serves three distinct user types with different security postures:

- **Patients** — convenience-focused; may be elderly or not technically sophisticated; use the platform infrequently.
- **Clinical staff / Admin** — high-security requirement; access to all patient records; must comply with the 15-minute idle session timeout mandated in FR-6.6.
- **IG Lead / Platform Owner** — highest privilege; audit log access; role management.

The 21-day delivery timeline means a custom OAuth/JWT implementation from scratch is not viable.

### Decision

Use **NextAuth.js v5 (Auth.js)** with two authentication strategies:

1. **Credentials provider** — username + password for clinical staff and admin. Passwords hashed with bcrypt (cost factor ≥ 12). MFA via TOTP (time-based one-time password) required for `CLINICIAN`, `ADMIN`, and `IG_LEAD` roles.
2. **Magic link (Email provider)** — passwordless one-time link for patients. Reduces friction for infrequent users who would otherwise forget passwords; eliminates password reuse risk for this cohort.

Session strategy: **JWT sessions** stored in HttpOnly, Secure, SameSite=Strict cookies. No server-side session store required, reducing infrastructure footprint.

Role claims (`role`, `userId`) are embedded in the JWT payload and validated on every API Route Handler via a `withAuth` middleware wrapper.

Clinical staff sessions enforce a **15-minute idle timeout** via NextAuth's `maxAge` combined with a client-side activity timer that calls `/api/auth/session` to extend or invalidate.

### Alternatives Considered

| Option | Reason Rejected |
|---|---|
| **Auth0** | US-based by default; data residency concern (patient identity data in Auth0 managed tenants may transit US infrastructure); significant per-MAU cost at scale; adds an external dependency for a core security function |
| **Clerk** | Excellent DX but US-headquartered; same data residency concerns as Auth0; opinionated UI components may conflict with bespoke design system; vendor lock-in risk |
| **Supabase Auth** | Viable (listed in PRD as alternative); however Supabase Auth is tightly coupled to Supabase's hosted Postgres, which introduces a second database dependency alongside the primary AWS RDS instance; complicates the architecture |
| **Custom JWT implementation** | High risk in a 21-day timeline; OWASP recommends against rolling custom auth; would require independent security audit before NHS deployment |

### NHS DTAC Compliance Notes

- **DTAC Security Domain** requires authentication controls commensurate with the sensitivity of data. TOTP MFA for clinical staff satisfies this requirement.
- **DTAC Clinical Safety (DCB0160)** requires that authentication failures are logged. NextAuth events (`signIn`, `signOut`, failure callbacks) are piped to the immutable audit log (FR-6.2).
- The 15-minute idle timeout (FR-6.6) maps directly to NHS DSP Toolkit Standard 9 ("Access Control") recommendation for automatic screen lock on unattended workstations.
- Magic links for patients have a **short TTL** (15 minutes) and are single-use — satisfying DTAC requirement that tokens cannot be replayed.
- All auth tokens are transmitted only over TLS 1.3 (NFR: Security).

### Consequences

**Positive:**
- NextAuth.js v5 is battle-tested in Next.js App Router; minimal boilerplate; well-audited by the community.
- Magic link removes password management burden for patients; reduces support load.
- JWT sessions are stateless — no Redis/session store required; simplifies infrastructure.
- Role claims in JWT enable zero-database-call RBAC checks on every request.

**Negative:**
- JWT sessions cannot be individually revoked server-side without a token blocklist (adds a Redis or DB lookup on every request if instant revocation is required). Mitigated by short session TTL (15 min for staff; 30 min for patients) and the idle timeout mechanism.
- TOTP MFA requires patients/staff to have an authenticator app; adds onboarding friction for non-technical clinical staff.
- Magic links require a reliable transactional email provider; if email delivery fails, the patient cannot log in. Mitigated by having a fallback OTP delivery path configurable in future.

---

## ADR-003: Video Provider

**Status:** Accepted  
**Date:** 21 September 2026

### Context

The platform must deliver browser-based telehealth video sessions (FR-3.1) with no app install requirement. NHS DTAC and UK GDPR mandate that special category health data (video content of clinical consultations) must not transit US infrastructure (data residency requirement). Sessions must include a waiting room pattern (FR-3.2, FR-3.3) and be mobile-responsive on iOS Safari and Android Chrome (FR-3.4). The platform is hosted entirely on AWS eu-west-2 (London).

### Decision

Use **Daily.co** with the following configuration:

- Rooms created server-side via the Daily REST API (`POST /v1/rooms`) per appointment, with expiry matching the appointment window.
- **EU region routing enforced** via room property `geo: "eu"` — Daily.co's EU region is Frankfurt-based; media never leaves EU infrastructure.
- **Waiting room** implemented via Daily's `send_owner_meeting_token` pattern: the patient receives a non-owner token that places them in a pre-join state; the clinician holds an owner token that triggers admission.
- The Daily.co `@daily-co/daily-js` JavaScript SDK is embedded directly into the Next.js app, rendering the video UI in a custom React component (not an iframe embed) to maintain visual consistency with the platform design.
- Pre-call device check (FR-3.5) uses Daily's `callObject.testWebcam()` and `testMic()` methods.
- Session link is embedded in the appointment confirmation email and accessible from the patient portal dashboard.

### Alternatives Considered

| Option | Reason Rejected |
|---|---|
| **Twilio Video** | Strong product; however Twilio's EU data residency requires explicit VPOP (Voice Points of Presence) configuration that adds complexity; Twilio Video is being discontinued (announced 2023, end-of-life path ongoing) — high long-term risk |
| **Agora** | Chinese-headquartered; data residency to UK/EU not contractually guaranteed to NHS/DTAC satisfaction; GDPR transfer mechanism (Standard Contractual Clauses) adds compliance overhead and risk |
| **Jitsi (self-hosted)** | Technically feasible and free; however requires running a Jitsi Videobridge on AWS EC2 (additional infrastructure to manage, patch, and monitor); media server scaling is non-trivial; 21-day timeline does not accommodate building and hardening a self-hosted media server |
| **Amazon Chime SDK** | Fully UK-resident (eu-west-2); however the SDK is significantly more complex to integrate than Daily.co; waiting room and participant management require significant custom backend logic; cost model less predictable at low volume |

### Data Residency Requirements

- Daily.co's **EU region** (`geo: "eu"`) routes media through Frankfurt (eu-central-1 equivalent).
- GDPR Article 44 international transfer: Daily.co is a US company with EU-based infrastructure. Data transfers to Daily.co are governed by Daily.co's **Data Processing Agreement (DPA)** and Standard Contractual Clauses (SCCs) per UK GDPR Chapter V.
- **Critical configuration**: Room creation API calls must always include `"geo": "eu"` — this must be enforced via a server-side validation check and documented in the DTAC evidence pack.
- Video content of clinical sessions is **not recorded by default** — recording would require explicit patient consent and introduces additional data retention obligations. Recording feature is excluded from scope (Out of Scope, Section 10).
- Patient name and appointment metadata sent to Daily.co room names should use opaque UUIDs, not PII, to minimise data shared with the processor.

### Consequences

**Positive:**
- Daily.co's pre-built React SDK dramatically reduces implementation time — estimated 2–3 days vs. 1–2 weeks for Jitsi self-hosted.
- Free tier covers 2,000 minutes/month — sufficient for a small clinic at launch with no upfront cost.
- EU region routing satisfies NHS DTAC data residency and UK GDPR requirements without complex SCCs audit.
- Waiting room pattern maps cleanly to the clinical workflow (FR-3.2/3.3).

**Negative:**
- Dependency on a third-party SaaS provider for a clinical-grade function; any Daily.co outage affects telehealth availability.
- EU region (`geo: "eu"`) is Frankfurt, not London — media may briefly touch EU (non-UK) infrastructure. For strict UK-only requirements post-Brexit, this should be flagged to the client. As of the DTAC guidance at project date, EU-region routing is considered acceptable.
- Cost scales with usage beyond the free tier (~$0.00045/participant-minute); at high consultation volume this becomes meaningful.

---

## ADR-004: Payment Flow

**Status:** Accepted  
**Date:** 21 September 2026

### Context

The billing module (M5) requires invoice generation and payment tracking. The PRD specifies Stripe is "pre-wired" but not activated at launch (FR-5.5, US-15) — online payment collection is an opt-in capability. The clinic operates in GBP. Patients may include both NHS-referred patients (where payment is NHS-managed externally) and private patients paying directly.

UK healthcare billing can be complex: some sessions may be invoiced to insurance companies; some to patients directly. The initial scope covers manual payment recording (cash, BACS, insurance) with Stripe as the online channel when activated.

### Decision

Use **Stripe** with the **Payment Intents API** and webhooks:

- **Payment Intents** are created server-side (`POST /api/payments/create-intent`) and the client secret is returned to the browser — the card is charged client-side via Stripe Elements, which means raw card data never touches the application server.
- **Stripe Elements** (the hosted card UI) renders the payment form — this is a PCI DSS SAQ A scope reduction (see below).
- **Webhooks** (`POST /api/payments/webhook`) listen for `payment_intent.succeeded`, `payment_intent.payment_failed`, and `invoice.paid` events to update the internal invoice status atomically.
- Webhook payloads are verified using `stripe.webhooks.constructEvent()` with the endpoint signing secret — prevents replay and forgery attacks.
- The Stripe integration is **feature-flagged at the environment variable level**: setting `STRIPE_LIVE_KEY` and `STRIPE_WEBHOOK_SECRET` activates online payment; removing them leaves the billing module in manual-only mode. No code changes required.
- Currency: GBP. All amounts stored in pence (integer) in the database to avoid floating-point rounding errors.

### Alternatives Considered

| Option | Reason Rejected |
|---|---|
| **GoCardless** | Excellent for recurring UK Direct Debit; however physiotherapy billing is typically per-session (not subscription); Direct Debit has a 3-day settlement delay unsuitable for same-day payment at appointment; GoCardless has no card payment capability |
| **PayPal** | Higher transaction fees than Stripe in the UK; poor developer experience for custom UI; PayPal Checkout redirects users off-platform, degrading UX and trust in a healthcare context |
| **Custom payment processing** | Would require PCI DSS Level 1 compliance audit — prohibitively expensive and time-consuming; rejected categorically |
| **Sumup / Square** | Primarily point-of-sale focused; limited programmatic invoice integration; no webhook-driven reconciliation |

### PCI DSS Scope Reduction via Stripe Elements

Using **Stripe Elements** (hosted card fields rendered in Stripe's iframe) means the application is in scope for **PCI DSS SAQ A** — the simplest self-assessment questionnaire. Key implications:

- Card numbers, CVVs, and expiry dates are entered directly into Stripe's iframe and never pass through the application server or database.
- The application server only receives a `PaymentIntent` client secret and subsequently a `PaymentMethod` ID — neither contains card data.
- TLS 1.3 enforcement (NFR: Security) satisfies SAQ A requirement 4.2.1 for secure transmission.
- The Stripe merchant account must be UK-registered and GBP-denominated to avoid cross-border payment restrictions.

### NHS Referral vs. Private Patient Handling

- Invoice records include a `payment_source` field: `PRIVATE_STRIPE | PRIVATE_MANUAL | INSURANCE | NHS_REFERRAL`.
- NHS referral invoices are created but marked `NHS_FUNDED` and not sent through Stripe — they are tracked manually.
- Insurance invoices follow the same manual recording path as cash/BACS.

### Consequences

**Positive:**
- Stripe is the industry standard; extensive documentation, UK support, and community resources.
- SAQ A PCI scope means no annual PCI audit — significant compliance cost saving.
- Stripe Elements works out-of-the-box on all target browsers including iOS Safari.
- Webhook-driven reconciliation ensures invoice status is always consistent with Stripe's records, even if the browser window closes mid-payment.
- Feature-flag architecture means the clinic can go live without activating payments and enable them later with zero code deployment.

**Negative:**
- Stripe fees: 1.5% + 20p per UK card transaction (as of 2026) — must be factored into the clinic's pricing.
- Stripe is a US-headquartered company; payment data is processed under Stripe's SCCs with the UK. This is standard practice and explicitly permitted under UK GDPR for payment processing, but should be noted in the DTAC DPA documentation.
- Webhooks require a publicly accessible HTTPS endpoint; local development requires a tool like the Stripe CLI (`stripe listen`) or ngrok — minor developer friction.

---

## ADR-005: NHS DTAC Compliance Approach

**Status:** Accepted  
**Date:** 21 September 2026

### Context

NHS Digital Technology Assessment Criteria (DTAC) is the mandatory framework for any digital health technology deployed within NHS England pathways. Since Harmony Physio Platform aims to serve NHS-referred patients and establish CQC inspection readiness, DTAC compliance evidence is a project deliverable (included as a $200 add-on in the project brief). DTAC covers five domains: Clinical Safety, Data Protection, Technical Assurance, Interoperability, and Usability & Accessibility.

### Decision

Adopt a **document-driven compliance approach with embedded technical controls** — meaning compliance obligations are satisfied through a combination of:

1. Technical controls built into the platform (authentication, encryption, audit logging, RBAC, data residency).
2. A formal documentation pack delivered as part of Milestone 2: DTAC self-assessment checklist, DPA template, DSPT evidence summary.

This approach is appropriate for a Tier 1 digital health tool (a practice management application, not a clinical decision support system) where DCB0129 clinical safety obligations are lighter than for AI-assisted diagnosis tools.

### DTAC Criteria and Technical Implementation

#### Domain 1: Clinical Safety (DCB0160 / DCB0129)

| DTAC Criterion | Technical Implementation |
|---|---|
| Clinical risk management process documented | Clinical Safety Case Report (CSCR) delivered as PDF in compliance pack; risk register maintained |
| Hazard log maintained | Identified hazards: data loss, unauthorized access to clinical notes, incorrect patient identity. Each has a mitigation mapped to a technical control |
| Clinical Safety Officer (CSO) designated | Client (Harmony Physio) designates their CSO; Kontra Digital provides the technical evidence |
| No unsafe clinical functionality | Platform is a record-keeping and booking tool; no automated clinical decision-making; SOAP notes are human-authored |

#### Domain 2: Data Protection (UK GDPR / DPA 2018)

| DTAC Criterion | Technical Implementation |
|---|---|
| Data Controller identified | Harmony Physiotherapy Clinic is the Data Controller; Kontra Digital is a Data Processor |
| Data Processing Agreement in place | DPA template delivered; covers lawful basis (Article 9(2)(h) — healthcare provision), retention periods, and sub-processor list |
| DPIA completed for high-risk processing | Data Protection Impact Assessment (DPIA) required: health data is special category; telehealth sessions involve biometric data in transit |
| Right to erasure workflow | FR-6.4: request → IG review → anonymisation/deletion → confirmation log |
| Data minimisation | FR-6.5: only clinically necessary fields collected at registration |
| Consent records | FR-6.3: granular consent records per patient with timestamp and version |
| Audit logs | FR-6.2: immutable audit log covering all data reads, writes, exports, and deletions |
| Data residency | All data in AWS eu-west-2; Daily.co EU region; no US transit for PII |

#### Domain 3: Technical Assurance

| DTAC Criterion | Technical Implementation |
|---|---|
| Transport encryption | TLS 1.3 enforced; HSTS headers; HTTP Strict Transport Security with `max-age=63072000` |
| Data at rest encryption | AES-256 on AWS RDS (PostgreSQL) and AWS S3 |
| Authentication controls | NextAuth.js v5; TOTP MFA for clinical staff (ADR-002); bcrypt password hashing |
| Session management | 15-minute idle timeout (FR-6.6); HttpOnly, Secure, SameSite=Strict session cookies |
| Role-based access control | RBAC with four roles: `PATIENT`, `CLINICIAN`, `ADMIN`, `IG_LEAD` (FR-6.1) |
| Penetration testing | Recommendation: client should commission a CREST-accredited penetration test before NHS go-live (out of project scope but documented in handover) |
| Vulnerability management | Dependencies managed via `pnpm audit`; Dependabot / Renovate for automated PRs; no production deployment of packages with known High/Critical CVEs |
| Backup and recovery | Daily automated snapshots; 30-day retention; RTO ≤ 4 hours (NFR: Backup) |
| Availability | 99.5% monthly SLA target; AWS eu-west-2 multi-AZ RDS for database resilience |

#### Domain 4: Interoperability

| DTAC Criterion | Technical Implementation |
|---|---|
| HL7 FHIR / NHS API integration | Not in scope for this delivery (Section 10: Out of Scope); NHS Spine integration is a future add-on requiring NHS IG agreement |
| Data export | GDPR Subject Access Request export (FR-2.7, US-18); data exportable in structured format |
| Open standards | REST API with JSON payloads; ISO 8601 datetime formatting; SNOMED CT codes not required at this tier |

#### Domain 5: Usability & Accessibility

| DTAC Criterion | Technical Implementation |
|---|---|
| WCAG 2.1 AA compliance | All UI components built to WCAG 2.1 AA (NFR: Accessibility); keyboard navigation required |
| User research evidence | Personas documented in PRD (Section 02); clinical workflow validated against physiotherapy practice requirements |
| Usability testing | Recommendation: conduct usability testing with at least one clinician and one patient before NHS go-live |

### Documentation Pack Deliverables

Delivered as PDFs at Milestone 2:

1. **DTAC Self-Assessment Checklist** — completed against all five DTAC domains.
2. **Data Protection Agreement (DPA) Template** — ready for signature between Harmony Physio (Controller) and Kontra Digital (Processor); includes sub-processor schedule (AWS, Daily.co, Stripe, Twilio/SNS).
3. **NHS DSPT Evidence Summary** — formatted for submission to NHS IG contact; mapped to DSPT Mandatory Evidence Items.
4. **Data Flow Diagram** — one-page service map showing all components, regions, and encryption states; suitable for CQC inspection.
5. **Clinical Safety Case Report (CSCR)** — lightweight hazard log and risk register per DCB0160.

### Consequences

**Positive:**
- Document-driven compliance is appropriate for Tier 1 tools and avoids the overhead of a full NHS onboarding process at this project scale.
- Technical controls built into the platform (audit logs, RBAC, encryption) generate the evidence that the compliance documentation references — no theatre, evidence is real.
- The DPA template and DSPT evidence summary reduce the client's administrative burden to near-zero for the initial NHS engagement.

**Negative / Risks:**
- DTAC is a living framework; NHS England updates criteria periodically. The compliance pack is accurate as of September 2026 but should be reviewed annually.
- A formal CREST-accredited penetration test is not in scope. This is a gap that NHS procurement teams may raise. The handover documentation must explicitly flag this and recommend it as a pre-go-live activity.
- DTAC compliance does not substitute for CQC registration or NHS contract approval — these are the client's responsibility. The platform provides the technical evidence; the client manages the regulatory relationship.
- NHS Spine / FHIR integration (required for full NHS EPR interoperability) is out of scope. If NHS referral volume grows, this will become a blocker.
