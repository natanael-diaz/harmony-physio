// ---------------------------------------------------------------------------
// Transactional email (task 2.5 — stub)
//
// Day 4 replaces the body of sendEmail with AWS SES. Everything above it is
// already shaped the way it will stay, so that swap is one function.
//
// Until then this logs and returns. It deliberately does NOT pretend to
// succeed silently: a stub that looks like a working mailer is how a broken
// verification flow reaches production unnoticed.
// ---------------------------------------------------------------------------

export type Email = {
  to: string;
  subject: string;
  /** Plain text. HTML bodies arrive with the SES integration. */
  body: string;
};

export type SendResult = { delivered: boolean; stubbed: boolean };

async function sendEmail(email: Email): Promise<SendResult> {
  // eslint-disable-next-line no-console
  console.warn(
    `[email:STUB] not actually sent — to=${email.to} subject="${email.subject}"\n${email.body}`,
  );
  return { delivered: false, stubbed: true };
}

/**
 * Send an address-verification link.
 *
 * The raw token appears only here and in the email. It is never persisted (see
 * createVerificationToken) and must not be logged anywhere that survives, which
 * is why the stub's output is a warning rather than an info line: it should be
 * uncomfortable to leave running.
 */
export async function sendVerificationEmail(
  to: string,
  rawToken: string,
  appUrl: string = process.env.AUTH_URL ?? "http://localhost:3000",
): Promise<SendResult> {
  const link = new URL("/verify-email", appUrl);
  link.searchParams.set("email", to);
  link.searchParams.set("token", rawToken);

  return sendEmail({
    to,
    subject: "Confirm your email address",
    body: [
      "Please confirm your email address to finish setting up your Harmony Physio account.",
      "",
      link.toString(),
      "",
      "This link works once and expires in 24 hours.",
      "If you did not create an account, you can ignore this email.",
    ].join("\n"),
  });
}
