# Harmony Physio — Design: Known Gaps

Status as of 22 September 2026, after Phase 2. Records what is **not** done in the
Penpot design, so Phase 3 has a real backlog. Companion to `design-system.md`.

Phases delivered so far:

- **Phase 1** — design tokens, colour ramps, type scale, 6 core components, booking step 3 (slot selection) + empty state, desktop 1440 & mobile 390.
- **Phase 2** — booking steps 1, 2, 4, 5, confirmation, sign-in (+ wrong credentials), patient dashboard (+ new-patient empty state), 7 further components. Both breakpoints throughout.

Verification note: all 24 claimed contrast ratios across both phases were recomputed
independently and matched exactly. Structure (22 screen boards, 13 library components,
2 token sets) was confirmed against the Penpot plugin API.

---

## Tier 1 — would break a real booking

Close these before any new product area.

- **No error state for step 5 confirm.** Payment declined, slot taken during the hold,
  and network failure all have no designed screen. Highest risk gap: it is the moment
  money and a clinical appointment are both on the line.
- **No hold-expiry state.** The 10-minute slot hold is promised in step 3 copy but
  nothing is designed for when it lapses.
- **No cancel / reschedule confirmation dialogs.** Buttons exist on the dashboard and
  the booking-confirmed screen with nothing behind them. Cancel inside 24 hours triggers
  a 50% charge — a charge-incurring action with no confirm step is a defect, not a
  missing nicety.
- **No loading or pending states anywhere.** Slot fetching, confirm submission and
  document download each jump straight from nothing to a finished state.

## Tier 2 — flows behind existing buttons

Each of these is reachable in the UI but leads nowhere.

- **Forgotten password / password reset** — entry point exists on sign in; the flow does not.
- **Message the clinic** — dashboard button with no screen behind it.
- **Account locked** — described in sign-in error copy ("locked for 15 minutes"), never drawn.
- **Dashboard tabs** — only *Upcoming* has a dedicated board. *Past appointments*,
  *Documents* and *Consent* are reachable and their content appears inline on the
  Upcoming view, but none has its own board.

## Tier 3 — craft issues, self-flagged

Raised by the designer rather than let pass as done.

- **Step-4 textarea is not a real textarea.** "What has brought you in?" renders as a
  fixed two-line box because height was set before layout resolved. Reads acceptably,
  but it is not a specified multi-line input: no character count, no expand behaviour.
- **No date-picker component.** The booking flow uses day chips and slot buttons so none
  was needed, but date of birth on step 4 is a plain text field showing "14 / 03 / 1989" —
  a placeholder for a real date input pattern, not a designed one.
- **Mobile step 4 is 2843px in a single scroll**, with no section navigation and no
  save-progress affordance. Complete, but the screen most likely to be abandoned on a
  phone. The designer's own assessment: "it is complete, but I do not think it is good."
- **"First available clinician" selected state is never shown.** On step 2 it is drawn
  unselected at both breakpoints while Nadia Karim is selected. Legitimate as a state,
  but the selected appearance of that card exists nowhere.
- **Only one clinician-unavailable reason is drawn** (Priya — wrong discipline). Fully
  booked, on leave, and no longer at the clinic are all real cases the list will hit.

## Tier 4 — deferred by decision

Better settled once the Tailwind implementation is real.

- No dark mode.
- No motion or transition specification.
- No breakpoints between 390 and 1440 — anything in between is undefined.

## Outside the patient flow — not started

Out of scope by instruction, deliberately not begun:

- Telehealth: waiting room / device check, in-call UI, secure messaging.
- Clinician side: dashboard, calendar/diary, SOAP note editor, patient record, treatment plans.
- Billing: invoice list and detail, payment records.
- GDPR admin layer: consent administration, audit log, role/permission admin,
  right-to-erasure workflow.

## Implementation gap

- **The Tailwind theme is untouched.** `apps/web/tailwind.config.ts` and
  `apps/web/app/globals.css` still hold the scaffold's placeholder sky/teal palette.
  Tokens are named to drop straight in, but that edit has not been made — so the running
  app reflects none of this design.

## Housekeeping

- The empty **"Page 1"** remains in the Penpot file. The plugin API exposes `createPage`
  but no removal method, and the `Page` object has no methods — verified directly. It
  must be deleted by hand in the Penpot UI.
