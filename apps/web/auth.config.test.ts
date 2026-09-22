import type { Role } from "@harmony/db";
import { afterEach, describe, expect, it, vi } from "vitest";

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

// ---------------------------------------------------------------------------
// Session lifecycle (task 2.7: "session persists across page reload")
//
// With the JWT strategy there is no server-side session. A reload is simply the
// next request presenting the same cookie, so persistence is exactly the
// behaviour of the jwt callback when it is handed an existing token and no
// user — and of the session callback projecting that token.
// ---------------------------------------------------------------------------

const { jwt, session } = authConfig.callbacks;

const signedInAt = new Date("2026-09-22T12:00:00.000Z").getTime();

function tokenAfterSignIn(role: Role) {
  vi.setSystemTime(signedInAt);
  return jwt({
    token: {},
    user: { id: "user_1", email: "u@harmony.test", role },
  } as never);
}

describe("session survives a reload", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps identity on a later request with no user object", async () => {
    vi.useFakeTimers();
    const first = (await tokenAfterSignIn("PATIENT")) as Record<string, unknown>;

    // Ten minutes later: a reload, within the 30 minute patient TTL.
    vi.setSystemTime(signedInAt + 10 * 60 * 1000);
    const reloaded = await jwt({ token: first } as never);

    expect(reloaded).not.toBeNull();
    expect((reloaded as Record<string, unknown>).role).toBe("PATIENT");
    expect((reloaded as Record<string, unknown>).userId).toBe("user_1");
  });

  it("projects role and id onto the session the page reads", async () => {
    vi.useFakeTimers();
    const token = await tokenAfterSignIn("CLINICIAN");

    const result = (await session({
      session: { user: {}, expires: "" },
      token,
    } as never)) as { user: { role: string; id: string }; expires: string };

    expect(result.user.role).toBe("CLINICIAN");
    expect(result.user.id).toBe("user_1");
    // Reports the role TTL, not the 30 minute ceiling in session.maxAge.
    expect(new Date(result.expires).getTime()).toBe(signedInAt + 15 * 60 * 1000);
  });

  it("expires a staff session at 15 minutes and a patient session at 30", async () => {
    vi.useFakeTimers();
    const staff = await tokenAfterSignIn("CLINICIAN");
    const patient = await tokenAfterSignIn("PATIENT");

    // Twenty minutes on: staff is gone, patient is still valid.
    vi.setSystemTime(signedInAt + 20 * 60 * 1000);
    expect(await jwt({ token: staff } as never)).toBeNull();
    expect(await jwt({ token: patient } as never)).not.toBeNull();

    // Forty minutes on: both gone.
    vi.setSystemTime(signedInAt + 40 * 60 * 1000);
    expect(await jwt({ token: patient } as never)).toBeNull();
  });
});
