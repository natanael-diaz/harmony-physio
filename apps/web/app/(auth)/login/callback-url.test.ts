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

  it("rejects non-string and empty input", () => {
    expect(safeCallbackUrl(null)).toBe("/dashboard");
    expect(safeCallbackUrl("")).toBe("/dashboard");
    expect(safeCallbackUrl("dashboard")).toBe("/dashboard");
  });
});
