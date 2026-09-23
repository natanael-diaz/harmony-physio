// ---------------------------------------------------------------------------
// GDPR consent policy (task 2.6)
//
// The User row records WHICH version of the privacy notice a person accepted
// and WHEN. Under UK GDPR Article 7(1) the controller must be able to
// demonstrate that consent was given, so this is evidence, not a preference —
// it is never silently back-filled, and a re-consent never overwrites the fact
// that an earlier version was accepted at an earlier time.
//
// Pure so the rule can be tested without a database or a clock.
// ---------------------------------------------------------------------------

/**
 * The privacy notice currently in force.
 *
 * Bumping this requires every user to accept again on their next visit, which
 * is the point: material changes to processing cannot ride on consent given to
 * the old text. Change it only alongside the notice itself.
 */
export const CONSENT_VERSION = "2026-09-01";

export type ConsentState = {
  consentGivenAt: Date | null;
  consentVersion: string | null;
};

export function needsConsent(
  state: ConsentState,
  currentVersion: string = CONSENT_VERSION,
): boolean {
  // Never consented at all.
  if (state.consentGivenAt === null || state.consentVersion === null) {
    return true;
  }

  // Consented to a different version of the notice — including, deliberately,
  // an unrecognised or newer one. If the stored value does not match what is in
  // force, we cannot claim the person agreed to what we are doing now.
  return state.consentVersion !== currentVersion;
}
