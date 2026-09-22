import type { Role } from "@harmony/db";
import { redirect } from "next/navigation";

import { ROLE_HOME } from "../auth.config";
import { auth } from "../auth";

/**
 * Assert the signed-in user holds `role`, or send them to their own area.
 *
 * Middleware already does this in `authorized`, so this is defence in depth —
 * and not theoretical. CVE-2025-29927 let a crafted `x-middleware-subrequest`
 * header skip Next middleware entirely; the pinned version is patched, but a
 * system holding patient records should not have role separation resting on a
 * single layer that a framework bug can switch off. Anything under a
 * role-owned route should call this.
 */
export async function requireRole(role: Role) {
  const session = await auth();

  if (!session?.user?.role) redirect("/login");
  if (session.user.role !== role) redirect(ROLE_HOME[session.user.role]);

  return session;
}
