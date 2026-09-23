"use client";

import { useFormState, useFormStatus } from "react-dom";

import { type ResendState, resendVerificationAction } from "./actions";

function Button({ sent }: { sent: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || sent}
      className="mt-6 w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {sent ? "Link sent" : pending ? "Sending…" : "Send me a new link"}
    </button>
  );
}

export function ResendButton() {
  const [state, formAction] = useFormState<ResendState, FormData>(
    resendVerificationAction,
    {},
  );

  return (
    <form action={formAction}>
      <Button sent={state.sent === true} />
      {state.sent ? (
        <p role="status" className="mt-3 text-xs text-ink-500">
          If that account needs verifying, a new link is on its way.
        </p>
      ) : null}
    </form>
  );
}
