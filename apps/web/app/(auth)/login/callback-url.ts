/**
 * Normalise a post-login destination to a safe, same-origin relative path.
 *
 * Two things have to hold at once, and the first version of this only managed
 * one of them:
 *
 *  1. An attacker must not be able to append ?callbackUrl=https://evil.example
 *     to a login link and be handed a freshly authenticated user.
 *  2. The legitimate value must survive. next-auth builds the sign-in redirect
 *     with `searchParams.set("callbackUrl", request.nextUrl.href)` — an
 *     ABSOLUTE url. Rejecting everything non-relative silently sent every deep
 *     link to /dashboard, so "return them to where they were headed" never
 *     actually worked.
 *
 * So absolute URLs are accepted when their origin matches ours, and re-emitted
 * as a relative path.
 */
export function safeCallbackUrl(
  raw: FormDataEntryValue | null,
  appUrl: string = process.env.AUTH_URL ?? "http://localhost:3000",
): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return "/dashboard";

  // Relative path with exactly one leading slash. "//evil.example" is
  // protocol-relative, and some browsers treat "/\evil.example" the same way,
  // so both are rejected.
  if (/^\/(?![/\\])/.test(value)) return value;

  // Absolute URL: keep it only if it points back at us.
  try {
    const target = new URL(value);
    const self = new URL(appUrl);
    if (target.origin !== self.origin) return "/dashboard";
    return `${target.pathname}${target.search}`;
  } catch {
    // Not a URL at all.
    return "/dashboard";
  }
}
