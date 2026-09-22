"use client";

import { useFormState, useFormStatus } from "react-dom";

import {
  type LoginErrorCode,
  type LoginState,
  signInAction,
} from "./actions";

// Copy is deliberately identical for unknown email and wrong password. A
// different message for each would let anyone enumerate the patient list from
// the login form.
const ERROR_COPY: Record<LoginErrorCode, string> = {
  INVALID_CREDENTIALS:
    "That email address and password do not match. Please try again.",
  ACCOUNT_LOCKED:
    "Too many failed attempts. For your security this account is locked for 15 minutes. Try again shortly, or contact the clinic if you need access sooner.",
  UNEXPECTED:
    "We could not sign you in just now. Please try again in a moment.",
};

function SubmitButton() {
  // Disabled while the action is in flight: a double submit spends two of the
  // five allowed attempts on the same password.
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction] = useFormState<LoginState, FormData>(
    signInAction,
    {},
  );

  const message = state.error ? ERROR_COPY[state.error] : null;

  return (
    <form action={formAction} className="space-y-4" aria-label="Sign-in form">
      {message ? (
        // role="alert" so screen readers announce it on arrival; the inputs
        // point at it via aria-describedby.
        <div
          role="alert"
          id="login-error"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
        >
          {message}
        </div>
      ) : null}

      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={message ? "login-error" : undefined}
          className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <a
            href="/forgot-password"
            className="text-xs text-sky-600 hover:text-sky-700"
          >
            Forgot password?
          </a>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={message ? "login-error" : undefined}
          className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          placeholder="••••••••"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
