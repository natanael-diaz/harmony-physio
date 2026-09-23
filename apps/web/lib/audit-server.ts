import "server-only";

import { logAction as dbLogAction } from "@harmony/db";
import type { LogActionInput } from "@harmony/db";
import { headers } from "next/headers";

/**
 * Extracts the client IP from request headers.
 *
 * Uses x-forwarded-for (first entry) then x-real-ip as a fallback.
 * Neither header is trustworthy in all deployments — proxies and load
 * balancers may strip or spoof them — so this value must never be used
 * for security-critical decisions. It is captured for audit trail context
 * only (GDPR Article 30 / NHS DTAC).
 */
export function getClientIp(): string | undefined {
  const hdrs = headers();
  const forwarded = hdrs.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = hdrs.get("x-real-ip");
  return real ?? undefined;
}

/**
 * Server-side audit helper: calls logAction from @harmony/db and
 * automatically injects the client IP so callers don't repeat that logic.
 */
export async function logAuditEvent(
  params: Omit<LogActionInput, "ipAddress">,
): Promise<void> {
  const ip = getClientIp();
  await dbLogAction({
    ...params,
    ...(ip !== undefined ? { ipAddress: ip } : {}),
  });
}
