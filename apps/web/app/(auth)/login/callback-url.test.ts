import { describe, expect, it } from "vitest";

import { safeCallbackUrl } from "./callback-url";

describe("safeCallbackUrl", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeCallbackUrl("/dashboard/patient")).toBe("/dashboard/patient");
    expect(safeCallbackUrl("/dashboard?tab=upcoming")).toBe(
      "/dashboard?tab=upcoming",
    );
  });

  it("rejects absolute URLs to other origins", () => {
    expect(safeCallbackUrl("https://evil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("http://evil.example/steal")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs", () => {
    // The classic bypass: starts with a slash, still leaves the site.
    expect(safeCallbackUrl("//evil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("/\\evil.example")).toBe("/dashboard");
  });

  it("accepts the absolute same-origin URL that middleware actually emits", () => {
    // The regression this file missed first time round: next-auth sets
    // callbackUrl to request.nextUrl.href, which is absolute. Rejecting it
    // sent every deep link to /dashboard.
    expect(
      safeCallbackUrl(
        "http://localhost:3000/dashboard/clinician",
        "http://localhost:3000",
      ),
    ).toBe("/dashboard/clinician");
  });

  it("preserves the query string on an absolute same-origin URL", () => {
    expect(
      safeCallbackUrl(
        "http://localhost:3000/dashboard?tab=upcoming",
        "http://localhost:3000",
      ),
    ).toBe("/dashboard?tab=upcoming");
  });

  it("still rejects an absolute URL on another origin", () => {
    expect(
      safeCallbackUrl("https://evil.example/dashboard", "http://localhost:3000"),
    ).toBe("/dashboard");
  });

  it("rejects a same-path URL on a lookalike host", () => {
    expect(
      safeCallbackUrl(
        "http://localhost:3000.evil.example/dashboard",
        "http://localhost:3000",
      ),
    ).toBe("/dashboard");
  });

  it("rejects non-string and empty input", () => {
    expect(safeCallbackUrl(null)).toBe("/dashboard");
    expect(safeCallbackUrl("")).toBe("/dashboard");
    expect(safeCallbackUrl("dashboard")).toBe("/dashboard");
  });
});
