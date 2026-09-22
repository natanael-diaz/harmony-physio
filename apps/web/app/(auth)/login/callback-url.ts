/**
 * Only same-origin relative paths are accepted as a post-login destination.
 *
 * Without this an attacker appends ?callbackUrl=https://evil.example to a login
 * link and the freshly authenticated user is handed straight to them. Lives in
 * its own module because a "use server" file may only export async functions,
 * and this needs to be unit-testable.
 */
export function safeCallbackUrl(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";

  // Exactly one leading slash. "//evil.example" is protocol-relative and would
  // leave the site; "/\evil.example" is treated as protocol-relative by some
  // browsers, so backslash is rejected too.
  if (/^\/(?![/\\])/.test(value)) return value;

  return "/dashboard";
}
