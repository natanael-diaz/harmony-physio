// ---------------------------------------------------------------------------
// Edge-safe auth configuration (tasks 2.1 / 2.2)
//
// Middleware runs on the edge runtime, which cannot load Prisma. auth.ts
// imports @harmony/db for the credentials lookup, so importing it from
// middleware would fail at build. This file therefore holds everything that
// needs no database — session policy, the JWT/session callbacks, and route
// authorization — and auth.ts adds the provider on top.
//
// Keep this file free of VALUE imports from @harmony/db. `import type` is fine:
// types are erased and never reach the edge bundle.
// ---------------------------------------------------------------------------

import type { Role } from "@harmony/db";
import type { NextAuthConfig } from "next-auth";

// ADR-002: 15 minutes for clinical staff, 30 for patients. Staff sessions sit
// in front of patient records on shared machines; patients get the longer TTL
// because re-authenticating mid-booking loses the booking.
export const SESSION_TTL_SECONDS: Record<Role, number> = {
  ADMIN: 15 * 60,
  CLINICIAN: 15 * 60,
  RECEPTIONIST: 15 * 60,
  PATIENT: 30 * 60,
};

/** Where each role belongs after signing in. ADMIN and RECEPTIONIST have no
 *  dedicated dashboard yet, so they land on the shared one. */
export const ROLE_HOME: Record<Role, string> = {
  PATIENT: "/dashboard/patient",
  CLINICIAN: "/dashboard/clinician",
  ADMIN: "/dashboard",
  RECEPTIONIST: "/dashboard",
};

/** Role-owned areas. A role may only enter its own. */
const ROLE_OWNED_PREFIXES: Array<{ prefix: string; owner: Role }> = [
  { prefix: "/dashboard/patient", owner: "PATIENT" },
  { prefix: "/dashboard/clinician", owner: "CLINICIAN" },
];

/**
 * Path containment on segment boundaries.
 *
 * A bare startsWith would make "/dashboard/patient" also match
 * "/dashboard/patients" — so the day someone adds a staff-facing patient LIST
 * at that path, clinicians get bounced out of it as trespassers.
 */
function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

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
export type HarmonyToken = {
  userId?: string;
  role?: Role;
  /** Epoch ms. Enforces the per-role TTL that session.maxAge cannot express. */
  absoluteExpiry?: number;
};

export const authConfig = {
  session: {
    strategy: "jwt",
    // The ceiling. Per-role expiry is enforced in the jwt callback below,
    // because NextAuth takes a single static maxAge and we need two.
    maxAge: Math.max(...Object.values(SESSION_TTL_SECONDS)),
  },

  pages: {
    signIn: "/login",
  },

  // Providers are added in auth.ts. The credentials provider pulls in Prisma,
  // which must not reach the edge bundle.
  providers: [],

  callbacks: {
    /**
     * Route authorization, consulted by middleware on every matched request.
     *
     * Returning false sends an unauthenticated visitor to the sign-in page with
     * a callbackUrl; returning a Response redirects outright.
     */
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;

      if (!pathname.startsWith("/dashboard")) return true;

      const role = session?.user?.role;
      if (!role) return false; // → /login?callbackUrl=…

      const home = ROLE_HOME[role];

      // /dashboard itself is a dispatcher: send each role to its own area.
      if (pathname === "/dashboard" && home !== "/dashboard") {
        return Response.redirect(new URL(home, request.nextUrl));
      }

      // Entering another role's area is a denial, not a convenience redirect:
      // a patient must never reach the clinician views.
      const trespass = ROLE_OWNED_PREFIXES.find(
        ({ prefix, owner }) => isUnder(pathname, prefix) && role !== owner,
      );
      if (trespass) {
        return Response.redirect(new URL(home, request.nextUrl));
      }

      return true;
    },

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
      //
      // A token with no absoluteExpiry is treated as expired rather than
      // waved through. Failing open here would give any cookie minted before
      // this shipped — or by a future provider that never reaches the `user`
      // branch above — the 30 minute patient ceiling on a clinician account.
      if (typeof harmonyToken.absoluteExpiry !== "number") return null;
      if (Date.now() > harmonyToken.absoluteExpiry) return null;

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
} satisfies NextAuthConfig;
