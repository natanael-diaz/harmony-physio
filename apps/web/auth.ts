// ---------------------------------------------------------------------------
// NextAuth v5 configuration (task 2.1)
//
// No Prisma adapter — see the note above model Account in schema.prisma. The
// adapter needs User.emailVerified to be DateTime?; ours is Boolean. Sessions
// are JWTs, so there is no server-side session store to adapt anyway.
//
// All the credentials logic lives in @harmony/db (authenticateCredentials), so
// it can be tested against a real database without booting NextAuth.
// ---------------------------------------------------------------------------

import { authenticateCredentials, prisma, type Role } from "@harmony/db";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

// ADR-002: 15 minutes for clinical staff, 30 for patients. Staff sessions sit
// in front of patient records on shared machines; patients get the longer TTL
// because re-authenticating mid-booking loses the booking.
const SESSION_TTL_SECONDS: Record<Role, number> = {
  ADMIN: 15 * 60,
  CLINICIAN: 15 * 60,
  RECEPTIONIST: 15 * 60,
  PATIENT: 30 * 60,
};

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * The fields we put on the JWT.
 *
 * Not a module augmentation: `@auth/core/jwt`, where the JWT interface is
 * actually declared, is not resolvable from apps/web under pnpm's strict
 * layout, so `declare module` there silently creates a phantom module rather
 * than augmenting anything. Pinning @auth/core as a direct dependency to work
 * around that risks drifting from the version next-auth resolves. A local type
 * applied at the callback boundary is narrower and honest about the cast.
 */
type HarmonyToken = {
  userId?: string;
  role?: Role;
  /** Epoch ms. Enforces the per-role TTL that session.maxAge cannot express. */
  absoluteExpiry?: number;
};

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
  session: {
    strategy: "jwt",
    // The ceiling. Per-role expiry is enforced in the jwt callback below,
    // because NextAuth takes a single static maxAge and we need two.
    maxAge: Math.max(...Object.values(SESSION_TTL_SECONDS)),
  },

  pages: {
    signIn: "/login",
  },

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

  callbacks: {
    async jwt({ token, user }) {
      const harmonyToken = token as HarmonyToken;

      // First call after a successful sign-in: stamp identity and the absolute
      // expiry for this role. Later calls only see `token`.
      if (user) {
        harmonyToken.role = user.role;
        // NextAuth types User.id as optional, though our authorize() always
        // returns one. Guarded rather than asserted so a future provider that
        // omits it degrades to an id-less session instead of stamping
        // undefined onto the token.
        if (user.id) harmonyToken.userId = user.id;
        harmonyToken.absoluteExpiry =
          Date.now() + SESSION_TTL_SECONDS[user.role] * 1000;
        return token;
      }

      // Past the role-specific TTL: returning null invalidates the session so
      // the next request is unauthenticated.
      if (
        typeof harmonyToken.absoluteExpiry === "number" &&
        Date.now() > harmonyToken.absoluteExpiry
      ) {
        return null;
      }

      return token;
    },

    async session({ session, token }) {
      const harmonyToken = token as HarmonyToken;

      // Carried on the token so RBAC needs no database round-trip per request
      // (ADR-002). Note this makes role changes take effect only at the next
      // sign-in — acceptable at a 15-30 minute TTL.
      if (harmonyToken.role) session.user.role = harmonyToken.role;
      if (harmonyToken.userId) session.user.id = harmonyToken.userId;

      // Report the role-specific expiry, not session.maxAge. Without this a
      // CLINICIAN session advertises the 30 minute ceiling while the jwt
      // callback actually invalidates it at 15, and any client counting down
      // to `expires` is simply wrong.
      if (typeof harmonyToken.absoluteExpiry === "number") {
        session.expires = new Date(
          harmonyToken.absoluteExpiry,
        ).toISOString() as typeof session.expires;
      }

      return session;
    },
  },
});
