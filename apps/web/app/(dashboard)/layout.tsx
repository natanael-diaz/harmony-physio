import { needsConsent, prisma } from "@harmony/db";
import { redirect } from "next/navigation";

import { auth } from "../../auth";
import { UnverifiedBanner } from "./unverified-banner";

/**
 * Consent gate for every authenticated area (task 2.6).
 *
 * Deliberately NOT in middleware. Consent state lives in the database, and
 * middleware runs on the edge runtime where Prisma cannot load. Putting it on
 * the JWT instead would make it stale for the life of the token: a user could
 * withdraw consent and keep browsing for the rest of their session, which is
 * precisely the thing consent records are supposed to prevent.
 *
 * So this costs one indexed lookup by primary key per dashboard render, and is
 * always current. Middleware still handles authentication; this handles consent
 * only.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Middleware should have caught this already. Repeated here because a layout
  // that assumes a session and gets none would render a signed-out page as if
  // it were signed in.
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      consentGivenAt: true,
      consentVersion: true,
      emailVerified: true,
    },
  });

  // The row backing a live session has gone — deleted mid-session, say. Fail
  // closed.
  if (!user) redirect("/login");

  if (needsConsent(user)) redirect("/consent");

  // Surfaced rather than enforced: whether an unverified address should block
  // access is a product decision, and gating it today would lock out every
  // existing account at once.
  return (
    <>
      {user.emailVerified ? null : <UnverifiedBanner />}
      {children}
    </>
  );
}
