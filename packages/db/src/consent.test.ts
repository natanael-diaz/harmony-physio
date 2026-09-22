import { describe, expect, it } from "vitest";

import { CONSENT_VERSION, needsConsent } from "./consent";

const GIVEN_AT = new Date("2026-09-10T09:00:00.000Z");

describe("needsConsent", () => {
  it("is satisfied by consent to the version in force", () => {
    expect(
      needsConsent({ consentGivenAt: GIVEN_AT, consentVersion: CONSENT_VERSION }),
    ).toBe(false);
  });

  it("requires consent from a user who has never given it", () => {
    expect(needsConsent({ consentGivenAt: null, consentVersion: null })).toBe(
      true,
    );
  });

  it("requires consent again when the notice is superseded", () => {
    // The whole point of versioning: material changes to processing must not
    // ride on agreement to the previous text.
    expect(
      needsConsent(
        { consentGivenAt: GIVEN_AT, consentVersion: "2026-01-01" },
        "2026-09-01",
      ),
    ).toBe(true);
  });

  it("treats an unrecognised stored version as not consented", () => {
    // Including one NEWER than current — after a rollback, say. If the stored
    // value is not what is in force, we cannot claim agreement to what we do
    // now.
    expect(
      needsConsent(
        { consentGivenAt: GIVEN_AT, consentVersion: "2027-01-01" },
        "2026-09-01",
      ),
    ).toBe(true);
  });

  it.each([
    ["a timestamp with no version", { consentGivenAt: GIVEN_AT, consentVersion: null }],
    ["a version with no timestamp", { consentGivenAt: null, consentVersion: CONSENT_VERSION }],
  ])("treats %s as incomplete and requires consent", (_label, state) => {
    // Half a record is not evidence that consent was given.
    expect(needsConsent(state)).toBe(true);
  });
});
