import { AuthError } from "next-auth";

import { beforeEach, describe, expect, it, vi } from "vitest";

// auth.ts pulls in Prisma via the credentials provider, so signIn is mocked:
// these tests are about how the action MAPS outcomes, not about authentication
// itself (covered in packages/db/src/authenticate.test.ts).
vi.mock("../../../auth", () => ({ signIn: vi.fn() }));

const { signIn } = await import("../../../auth");

/** Shape Auth.js produces when authorize() throws: the real code sits on cause.err. */
function callbackError(code: string) {
  const error = new AuthError("CallbackRouteError");
  (error as unknown as { cause: unknown }).cause = { err: { code } };
  return error;
}

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const VALID = { email: "patient@harmony.test", password: "Harmony!2026" };

// The module under test is loaded per test, not statically at the top of the
// file. A static (or top-level dynamic) import of ./actions here resolves
// ../../../auth before the mock registry is applied, so the real auth.ts — and
// with it Prisma — leaks in and the mocked rejection never reaches the action.
let signInAction: typeof import("./actions").signInAction;

beforeEach(async () => {
  vi.mocked(signIn).mockClear();
  ({ signInAction } = await import("./actions"));
});

describe("signInAction", () => {
  it("maps a wrong password to INVALID_CREDENTIALS", async () => {
    vi.mocked(signIn).mockRejectedValue(callbackError("INVALID_CREDENTIALS"));
    expect(await signInAction({}, form(VALID))).toEqual({
      error: "INVALID_CREDENTIALS",
    });
  });

  it("maps a locked account to ACCOUNT_LOCKED", async () => {
    vi.mocked(signIn).mockRejectedValue(callbackError("ACCOUNT_LOCKED"));
    expect(await signInAction({}, form(VALID))).toEqual({
      error: "ACCOUNT_LOCKED",
    });
  });

  it("reports an unrecognised AuthError as UNEXPECTED, not bad credentials", async () => {
    // Otherwise a misconfigured deployment tells every user their correct
    // password is wrong, and they retype it forever.
    vi.mocked(signIn).mockRejectedValue(callbackError("SomethingElse"));
    expect(await signInAction({}, form(VALID))).toEqual({ error: "UNEXPECTED" });
  });

  it("answers a malformed email exactly as a wrong password", async () => {
    const result = await signInAction({}, form({ email: "nope", password: "x" }));
    expect(result).toEqual({ error: "INVALID_CREDENTIALS" });
    // Rejected before any lookup, so it cannot be timed or counted either.
    expect(signIn).not.toHaveBeenCalled();
  });

  it("rethrows the redirect a successful sign-in raises", async () => {
    // signIn signals success by throwing NEXT_REDIRECT. Swallowing it here
    // would break every login while looking like a handled error.
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/dashboard;307;",
    });
    vi.mocked(signIn).mockRejectedValue(redirect);

    await expect(signInAction({}, form(VALID))).rejects.toThrow("NEXT_REDIRECT");
  });
});

describe("no internal detail reaches the client", () => {
  it.each(["INVALID_CREDENTIALS", "ACCOUNT_LOCKED", "SomethingElse"])(
    "returns only an error code for %s",
    async (code) => {
      vi.mocked(signIn).mockRejectedValue(callbackError(code));

      const state = await signInAction({}, form(VALID));

      // The returned state is serialised to the browser. A stack trace, SQL
      // fragment or provider name in here is an information leak.
      expect(Object.keys(state)).toEqual(["error"]);
      const serialised = JSON.stringify(state);
      expect(serialised).not.toMatch(/at |\.ts:|stack|prisma|SELECT|UPDATE/i);
    },
  );

  it("does not echo the submitted password back", async () => {
    vi.mocked(signIn).mockRejectedValue(callbackError("INVALID_CREDENTIALS"));
    const state = await signInAction({}, form(VALID));
    expect(JSON.stringify(state)).not.toContain(VALID.password);
  });
});

describe("post-login destination", () => {
  it("passes a relative callbackUrl through to signIn", async () => {
    vi.mocked(signIn).mockResolvedValue(undefined as never);
    await signInAction({}, form({ ...VALID, callbackUrl: "/dashboard/patient" }));

    expect(signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ redirectTo: "/dashboard/patient" }),
    );
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example"])(
    "refuses to redirect to %s",
    async (hostile) => {
      vi.mocked(signIn).mockResolvedValue(undefined as never);
      await signInAction({}, form({ ...VALID, callbackUrl: hostile }));

      expect(signIn).toHaveBeenCalledWith(
        "credentials",
        expect.objectContaining({ redirectTo: "/dashboard" }),
      );
    },
  );
});
