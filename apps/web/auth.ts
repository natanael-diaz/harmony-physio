// ---------------------------------------------------------------------------
// NextAuth v5 — full configuration (task 2.1)
//
// No Prisma adapter: see the note above model Account in schema.prisma. The
// adapter needs User.emailVerified to be DateTime?; ours is Boolean. Sessions
// are JWTs, so there is no server-side session store to adapt anyway.
//
// Session policy and route authorization live in auth.config.ts, which stays
// database-free so middleware can import it on the edge runtime. This file adds
// the credentials provider, which pulls in Prisma and is therefore Node-only.
//
// The credentials logic itself lives in @harmony/db (authenticateCredentials),
// so it can be driven against a real database without booting NextAuth.
// ---------------------------------------------------------------------------

import { authenticateCredentials, prisma } from "@harmony/db";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Both extend CredentialsSignin so they carry a stable `code`.
//
// Known limitation of the pinned version: in @auth/core 0.32.0 (what
// next-auth@5.0.0-beta.19 depends on) CredentialsSignin extends Error rather
// than AuthError. The callback route rethrows only `instanceof AuthError`, so
// every authorize() failure — including a bare `return null` — is wrapped in
// CallbackRouteError and redirects with `error=Configuration`. The redirect
// query param is therefore useless for telling a lockout from a bad password
// on this version.
//
// Task 2.3 must read the code from the thrown error instead: signIn() in a
// server action throws, and the original error is reachable at
// `error.cause.err.code`. Upgrading next-auth (beta.25+ makes CredentialsSignin
// extend AuthError) would fix the redirect path, but that is a dependency
// decision beyond this task.

/** Wrong password, unknown email, or soft-deleted account — deliberately one
 *  error, so the response cannot be used to enumerate accounts. */
export class InvalidCredentialsError extends CredentialsSignin {
  code = "INVALID_CREDENTIALS";
}

/** Distinct from the above on purpose: a locked-out user cannot act without
 *  being told. See the trade-off note in authenticateCredentials. */
export class AccountLockedError extends CredentialsSignin {
  code = "ACCOUNT_LOCKED";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        // A malformed submission is not a hint that the account exists.
        if (!parsed.success) throw new InvalidCredentialsError();

        const result = await authenticateCredentials(
          prisma,
          parsed.data.email,
          parsed.data.password,
        );

        if (result.ok) {
          return {
            id: result.user.id,
            email: result.user.email,
            role: result.user.role,
          };
        }

        if (result.reason === "ACCOUNT_LOCKED") {
          throw new AccountLockedError();
        }

        // Same answer for unknown email, wrong password and soft-deleted.
        throw new InvalidCredentialsError();
      },
    }),
  ],
});
