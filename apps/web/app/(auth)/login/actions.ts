"use server";

// ---------------------------------------------------------------------------
// Sign-in server action (task 2.3)
//
// A server action rather than a POST to /api/auth/callback/credentials, because
// the redirect path cannot tell a lockout from a bad password on the pinned
// next-auth version (see the note in auth.ts). Here the error is thrown to us
// directly and we can read its real code.
// ---------------------------------------------------------------------------

import { AuthError } from "next-auth";
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
    // On success signIn throws NEXT_REDIRECT, which is NOT an AuthError and
    // MUST propagate — catching it here would silently break every login.
    if (error instanceof AuthError) {
      const code = (error as { cause?: { err?: { code?: string } } }).cause?.err
        ?.code;

      if (code === "ACCOUNT_LOCKED") return { error: "ACCOUNT_LOCKED" };
      if (code === "INVALID_CREDENTIALS") return { error: "INVALID_CREDENTIALS" };

      // An AuthError we did not throw ourselves — a misconfiguration, say.
      // Do not report it as bad credentials; that would send the user round a
      // loop retyping a correct password.
      return { error: "UNEXPECTED" };
    }

    throw error;
  }

  // Unreachable: a successful signIn always redirects.
  return {};
}
