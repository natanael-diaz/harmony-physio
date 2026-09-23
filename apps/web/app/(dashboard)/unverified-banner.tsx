"use client";

import { useFormState, useFormStatus } from "react-dom";

import {
  type ResendState,
  resendVerificationAction,
} from "../(auth)/verify-email/actions";

function Button({ sent }: { sent: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || sent}
      className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {sent ? "Link sent" : pending ? "Sending…" : "Send verification link"}
    </button>
  );
}

/**
 * The entry point the verification flow was missing.
 *
 * Tokens, the send stub and the consumption page all existed, but nothing ever
 * issued a token: no signup flow exists yet, and login does not check
 * emailVerified. So an unverified user had no route to a link at all. This
 * gives them one without gating access, which stays a product decision.
 */
export function UnverifiedBanner() {
  const [state, formAction] = useFormState<ResendState, FormData>(
    resendVerificationAction,
    {},
  );

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <form
        action={formAction}
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8"
      >
        <p className="text-xs text-amber-900">
          {state.sent
            ? "Check your inbox for a link to confirm your email address."
            : "Your email address is not confirmed yet."}
        </p>
        <Button sent={state.sent === true} />
      </form>
    </div>
  );
}
