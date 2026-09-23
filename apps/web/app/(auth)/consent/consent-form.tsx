"use client";

import { useFormStatus } from "react-dom";

function SubmitButton() {
  // Consent writes a timestamp that is legal evidence; a double submit would
  // overwrite the first one with a second, marginally later, record.
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Saving…" : "I have read and agree"}
    </button>
  );
}

export function ConsentForm({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <SubmitButton />
    </form>
  );
}
