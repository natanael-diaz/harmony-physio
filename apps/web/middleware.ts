// ---------------------------------------------------------------------------
// Route protection (task 2.2)
//
// Built from auth.config.ts, NOT auth.ts: middleware runs on the edge runtime,
// and auth.ts imports Prisma through the credentials provider. With the JWT
// session strategy the middleware only has to verify a signed cookie, so it
// needs no database and no provider.
//
// The decision itself is the `authorized` callback in auth.config.ts.
// ---------------------------------------------------------------------------

import NextAuth from "next-auth";

import { authConfig } from "./auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  /**
   * Only /dashboard/* is matched.
   *
   * Deliberately NOT a catch-all with exclusions: /api/auth/* must never pass
   * through middleware (it would recurse through the sign-in redirect), and
   * running auth on static assets costs latency on every request for nothing.
   * New protected areas get added here explicitly.
   */
  matcher: ["/dashboard/:path*"],
};
