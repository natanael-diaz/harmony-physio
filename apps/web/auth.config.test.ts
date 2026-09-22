import type { Role } from "@harmony/db";
import { describe, expect, it } from "vitest";

import { ROLE_HOME, authConfig } from "./auth.config";

// The authorized callback is the access-control boundary, so it is worth
// testing directly rather than only through a running server.
const authorized = authConfig.callbacks.authorized;

function check(pathname: string, role: Role | null) {
  const request = { nextUrl: new URL(`http://localhost${pathname}`) };
  const auth = role
    ? { user: { id: "u1", email: "u@harmony.test", role }, expires: "" }
    : null;
  // The callback's real params carry far more than these two fields; the cast
  // keeps the fixture to what it actually reads.
  return authorized({ auth, request } as never);
}

/** Normalise the three possible return shapes into something assertable. */
function outcome(result: unknown): string {
  if (result === true) return "ALLOW";
  if (result === false) return "SIGN_IN";
  return new URL((result as Response).headers.get("location") ?? "").pathname;
}

describe("authorized — unauthenticated", () => {
  it("sends anonymous visitors on /dashboard to sign in", () => {
    expect(outcome(check("/dashboard", null))).toBe("SIGN_IN");
    expect(outcome(check("/dashboard/patient", null))).toBe("SIGN_IN");
  });

  it("leaves public routes alone", () => {
    expect(outcome(check("/", null))).toBe("ALLOW");
    expect(outcome(check("/login", null))).toBe("ALLOW");
  });
});

describe("authorized — /dashboard dispatches by role", () => {
  it.each([
    ["PATIENT", "/dashboard/patient"],
    ["CLINICIAN", "/dashboard/clinician"],
  ] as Array<[Role, string]>)("%s -> %s", (role, destination) => {
    expect(outcome(check("/dashboard", role))).toBe(destination);
  });

  it.each(["ADMIN", "RECEPTIONIST"] as Role[])(
    "%s stays on the shared dashboard (no role dashboard exists yet)",
    (role) => {
      expect(ROLE_HOME[role]).toBe("/dashboard");
      // Must not redirect to itself — that is an infinite loop.
      expect(outcome(check("/dashboard", role))).toBe("ALLOW");
    },
  );
});

describe("authorized — cross-role access is denied", () => {
  it("keeps a patient out of the clinician area", () => {
    expect(outcome(check("/dashboard/clinician", "PATIENT"))).toBe(
      "/dashboard/patient",
    );
  });

  it("keeps a clinician out of the patient area", () => {
    expect(outcome(check("/dashboard/patient", "CLINICIAN"))).toBe(
      "/dashboard/clinician",
    );
  });

  it("keeps staff without a role area out of both", () => {
    expect(outcome(check("/dashboard/patient", "ADMIN"))).toBe("/dashboard");
    expect(outcome(check("/dashboard/clinician", "RECEPTIONIST"))).toBe(
      "/dashboard",
    );
  });

  it("allows each role into its own area", () => {
    expect(outcome(check("/dashboard/patient", "PATIENT"))).toBe("ALLOW");
    expect(outcome(check("/dashboard/clinician", "CLINICIAN"))).toBe("ALLOW");
  });

  it("protects nested paths, not just the area root", () => {
    expect(outcome(check("/dashboard/clinician/patients/123", "PATIENT"))).toBe(
      "/dashboard/patient",
    );
  });
});
