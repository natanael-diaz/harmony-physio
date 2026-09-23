import { cache } from "react";

import { auth } from "../auth";

/**
 * Per-request cached wrapper around `auth()`.
 *
 * `auth()` hits the database / JWT on every call.  React's `cache()` dedupes
 * identical calls within the same server render tree, so DashboardLayout and
 * requireRole (which both need the session) only pay the cost once per request.
 *
 * Must stay in a separate module — not inside auth.ts itself — so that
 * route-level files can import it without pulling in NextAuth edge-runtime code
 * that conflicts with Node-only dependencies.
 */
export const getSession = cache(auth);
