import { afterEach, describe, expect, it, vi } from "vitest";

import { sendVerificationEmail } from "./email";

afterEach(() => {
  vi.restoreAllMocks();
});

function captureWarn() {
  return vi.spyOn(console, "warn").mockImplementation(() => {});
}

describe("sendVerificationEmail", () => {
  it("builds a link the verify-email page can actually consume", async () => {
    const warn = captureWarn();

    await sendVerificationEmail(
      "newpatient@harmony.test",
      "raw-token-value",
      "https://app.harmonyphysio.co.uk",
    );

    const body = warn.mock.calls[0]?.[0] as string;
    const link = body.match(/https:\/\/\S+/)?.[0] ?? "";
    const url = new URL(link);

    // These three must stay in step with app/(auth)/verify-email/page.tsx,
    // which reads exactly these two params off this path.
    expect(url.pathname).toBe("/verify-email");
    expect(url.searchParams.get("token")).toBe("raw-token-value");
    expect(url.searchParams.get("email")).toBe("newpatient@harmony.test");
  });

  it("percent-encodes the address rather than breaking the URL", async () => {
    const warn = captureWarn();

    await sendVerificationEmail("a+tag@harmony.test", "tok", "https://x.test");

    const body = warn.mock.calls[0]?.[0] as string;
    const url = new URL(body.match(/https:\/\/\S+/)?.[0] ?? "");
    // A raw "+" in a query string decodes to a space, which would make the
    // address not match any user.
    expect(url.searchParams.get("email")).toBe("a+tag@harmony.test");
  });

  it("reports that it did not deliver", async () => {
    captureWarn();

    const result = await sendVerificationEmail("a@harmony.test", "tok");

    // The stub must not look like a working mailer; that is how a broken
    // verification flow reaches production unnoticed.
    expect(result).toEqual({ delivered: false, stubbed: true });
  });
});
