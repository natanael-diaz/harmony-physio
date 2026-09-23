"use server";

// ---------------------------------------------------------------------------
// Sign-in server action (task 2.3)
//
// A server action rather than a POST to /api/auth/callback/credentials, because
// the redirect path cannot tell a lockout from a bad password on the pinned
// next-auth version (see the note in auth.ts). Here the error is thrown to us
// directly and we can read its real code.
// ---------------------------------------------------------------------------

import { z } from "zod";

import { signIn } from "../../../auth";
import { safeCallbackUrl } from "./callback-url";

export type LoginErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "UNEXPECTED";

export type LoginState = { error?: LoginErrorCode };

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** `throw null` is legal JavaScript, and reading a property off it inside the
 *  catch turns a recoverable failure into an opaque 500 raised from the
 *  handler itself. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Next signals a redirect by throwing an error carrying a NEXT_REDIRECT digest. */
function isRedirectError(error: unknown): boolean {
  if (!isObject(error)) return false;
  return typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT");
}

/** Auth.js errors all carry a `type` set by the AuthError base constructor. */
function isAuthJsError(error: unknown): boolean {
  return isObject(error) && typeof error.type === "string";
}

export async function signInAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  // A malformed submission gets the same answer as a wrong password. Telling
  // the user their email is badly formatted is fine; doing it differently per
  // account is not, so there is one code for both.
  if (!parsed.success) return { error: "INVALID_CREDENTIALS" };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    // On success signIn throws NEXT_REDIRECT. It MUST propagate — catching it
    // here would silently break every login while looking handled.
    if (isRedirectError(error)) throw error;

    // Detection is by shape, not `instanceof AuthError`. Auth.js re-exports its
    // error classes through @auth/core, and the identity of those classes is
    // not stable across bundling boundaries — the same reason the
    // CredentialsSignin check inside Auth.js itself fails on this version (see
    // auth.ts). A shape check holds regardless of which copy threw.
    const code = isObject(error)
      ? (error as { cause?: { err?: { code?: string } } }).cause?.err?.code
      : undefined;

    if (code === "ACCOUNT_LOCKED") return { error: "ACCOUNT_LOCKED" };
    if (code === "INVALID_CREDENTIALS") return { error: "INVALID_CREDENTIALS" };

    // An Auth.js error we did not raise ourselves — a misconfiguration, say.
    // Reported as unexpected rather than as bad credentials, so a broken
    // deployment does not tell users their correct password is wrong.
    if (isAuthJsError(error)) return { error: "UNEXPECTED" };

    // Anything else is a genuine bug. Let it surface rather than disguising it
    // as a failed login.
    throw error;
  }

  // Unreachable: a successful signIn always redirects.
  return {};
}
