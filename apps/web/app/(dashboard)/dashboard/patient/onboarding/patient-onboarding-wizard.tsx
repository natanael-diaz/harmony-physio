"use client";

import { Button } from "@harmony/ui";
import { useState } from "react";

import type { PatientOnboardingData } from "./actions";
import { createPatientProfileAction } from "./actions";

const TOTAL_STEPS = 5;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "cy", label: "Welsh (Cymraeg)" },
  { value: "pl", label: "Polish (Polski)" },
  { value: "ur", label: "Urdu (اردو)" },
  { value: "pa", label: "Punjabi (ਪੰਜਾਬੀ)" },
  { value: "bn", label: "Bengali (বাংলা)" },
  { value: "so", label: "Somali (Soomaali)" },
  { value: "ar", label: "Arabic (العربية)" },
  { value: "other", label: "Other" },
];

type FieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "error"> & {
  label: string;
  error?: string | undefined;
};

function Field({ label, error, id, ...props }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
      </label>
      <input
        id={id}
        className="block w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 placeholder-ink-400 shadow-sm transition-colors focus:border-peri-500 focus:outline-none focus:ring-2 focus:ring-peri-500/20 disabled:bg-ink-50"
        {...props}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function PatientOnboardingWizard() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<PatientOnboardingData>>({
    country: "GB",
    preferredLanguage: "en",
    requiresInterpreter: false,
    medicalAlerts: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alertInput, setAlertInput] = useState("");

  function patch(updates: Partial<PatientOnboardingData>) {
    setFormData((prev) => ({ ...prev, ...updates }));
  }

  function validateStep(): boolean {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!formData.dateOfBirth) errs.dateOfBirth = "Date of birth is required.";
      if (!formData.gender?.trim()) errs.gender = "Gender is required.";
      if (!formData.phone?.trim()) errs.phone = "Phone number is required.";
    }
    if (step === 2) {
      if (!formData.addressLine1?.trim()) errs.addressLine1 = "Address is required.";
      if (!formData.city?.trim()) errs.city = "City is required.";
      if (!formData.postcode?.trim()) errs.postcode = "Postcode is required.";
      else if (!/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(formData.postcode))
        errs.postcode = "Enter a valid UK postcode (e.g. SW1A 1AA).";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (validateStep()) setStep((s) => s + 1);
  }

  function back() {
    setErrors({});
    setStep((s) => s - 1);
  }

  function addAlert() {
    const val = alertInput.trim();
    if (!val) return;
    patch({ medicalAlerts: [...(formData.medicalAlerts ?? []), val] });
    setAlertInput("");
  }

  function removeAlert(idx: number) {
    patch({ medicalAlerts: (formData.medicalAlerts ?? []).filter((_, i) => i !== idx) });
  }

  async function handleSubmit() {
    if (!validateStep()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createPatientProfileAction(formData as PatientOnboardingData);
      if (!result.ok) setSubmitError(result.error);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-ink-500">
          <span>Step {step} of {TOTAL_STEPS}</span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-2 rounded-full bg-peri-600 transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1 — Personal Info */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-ink-900">Personal information</h2>
          <Field
            id="dateOfBirth"
            label="Date of birth"
            type="date"
            value={formData.dateOfBirth ?? ""}
            onChange={(e) => patch({ dateOfBirth: e.target.value })}
            error={errors.dateOfBirth}
            max={new Date().toISOString().split("T")[0]}
          />
          <Field
            id="gender"
            label="Gender"
            type="text"
            placeholder="e.g. Female, Male, Non-binary"
            value={formData.gender ?? ""}
            onChange={(e) => patch({ gender: e.target.value })}
            error={errors.gender}
          />
          <Field
            id="phone"
            label="Phone number"
            type="tel"
            placeholder="+44 7700 900000"
            value={formData.phone ?? ""}
            onChange={(e) => patch({ phone: e.target.value })}
            error={errors.phone}
          />
          <Field
            id="nhsNumber"
            label="NHS number (optional)"
            type="text"
            placeholder="000 000 0000"
            value={formData.nhsNumber ?? ""}
            onChange={(e) => patch({ nhsNumber: e.target.value })}
          />
        </div>
      )}

      {/* Step 2 — Address */}
      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-ink-900">Your address</h2>
          <Field
            id="addressLine1"
            label="Address line 1"
            type="text"
            placeholder="123 Example Street"
            value={formData.addressLine1 ?? ""}
            onChange={(e) => patch({ addressLine1: e.target.value })}
            error={errors.addressLine1}
          />
          <Field
            id="addressLine2"
            label="Address line 2 (optional)"
            type="text"
            placeholder="Flat 4B"
            value={formData.addressLine2 ?? ""}
            onChange={(e) => patch({ addressLine2: e.target.value })}
          />
          <Field
            id="city"
            label="City"
            type="text"
            placeholder="London"
            value={formData.city ?? ""}
            onChange={(e) => patch({ city: e.target.value })}
            error={errors.city}
          />
          <Field
            id="postcode"
            label="Postcode"
            type="text"
            placeholder="SW1A 1AA"
            value={formData.postcode ?? ""}
            onChange={(e) => patch({ postcode: e.target.value.toUpperCase() })}
            error={errors.postcode}
          />
        </div>
      )}

      {/* Step 3 — GP Details (optional) */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">GP details</h2>
            <p className="mt-1 text-sm text-ink-500">
              Optional — helps us contact your GP for referrals and letters.
            </p>
          </div>
          <Field
            id="gpName"
            label="GP name"
            type="text"
            placeholder="Dr Jane Smith"
            value={formData.gpName ?? ""}
            onChange={(e) => patch({ gpName: e.target.value })}
          />
          <Field
            id="gpPractice"
            label="GP practice"
            type="text"
            placeholder="Elm Tree Surgery"
            value={formData.gpPractice ?? ""}
            onChange={(e) => patch({ gpPractice: e.target.value })}
          />
          <Field
            id="gpAddress"
            label="GP practice address"
            type="text"
            placeholder="45 High Street, London"
            value={formData.gpAddress ?? ""}
            onChange={(e) => patch({ gpAddress: e.target.value })}
          />
        </div>
      )}

      {/* Step 4 — Emergency Contact (optional) */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Emergency contact</h2>
            <p className="mt-1 text-sm text-ink-500">Optional — who should we call in an emergency?</p>
          </div>
          <Field
            id="emergencyContactName"
            label="Full name"
            type="text"
            placeholder="John Smith"
            value={formData.emergencyContactName ?? ""}
            onChange={(e) => patch({ emergencyContactName: e.target.value })}
          />
          <Field
            id="emergencyContactPhone"
            label="Phone number"
            type="tel"
            placeholder="+44 7700 900001"
            value={formData.emergencyContactPhone ?? ""}
            onChange={(e) => patch({ emergencyContactPhone: e.target.value })}
          />
          <Field
            id="emergencyContactRelation"
            label="Relationship to you"
            type="text"
            placeholder="Spouse, Parent, Sibling…"
            value={formData.emergencyContactRelation ?? ""}
            onChange={(e) => patch({ emergencyContactRelation: e.target.value })}
          />
        </div>
      )}

      {/* Step 5 — Accessibility & Medical Alerts */}
      {step === 5 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-ink-900">Accessibility &amp; medical alerts</h2>

          <div>
            <label htmlFor="preferredLanguage" className="mb-1.5 block text-sm font-medium text-ink-700">
              Preferred language
            </label>
            <select
              id="preferredLanguage"
              className="block w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 shadow-sm focus:border-peri-500 focus:outline-none focus:ring-2 focus:ring-peri-500/20"
              value={formData.preferredLanguage ?? "en"}
              onChange={(e) => patch({ preferredLanguage: e.target.value })}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="requiresInterpreter"
              type="checkbox"
              className="h-4 w-4 rounded border-ink-300 text-peri-600 focus:ring-peri-500"
              checked={formData.requiresInterpreter ?? false}
              onChange={(e) => patch({ requiresInterpreter: e.target.checked })}
            />
            <label htmlFor="requiresInterpreter" className="text-sm text-ink-700">
              I require an interpreter
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Medical alerts (optional)
            </label>
            <p className="mb-2 text-xs text-ink-500">Type an alert and press Enter to add it.</p>
            <div className="flex gap-2">
              <input
                type="text"
                className="block flex-1 rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 placeholder-ink-400 shadow-sm focus:border-peri-500 focus:outline-none focus:ring-2 focus:ring-peri-500/20"
                placeholder="e.g. Penicillin allergy"
                value={alertInput}
                onChange={(e) => setAlertInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAlert(); } }}
              />
              <Button variant="secondary" size="sm" type="button" onClick={addAlert}>
                Add
              </Button>
            </div>
            {(formData.medicalAlerts ?? []).length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {(formData.medicalAlerts ?? []).map((alert, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700"
                  >
                    {alert}
                    <button
                      type="button"
                      onClick={() => removeAlert(i)}
                      className="text-rose-500 hover:text-rose-700"
                      aria-label={`Remove ${alert}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {submitError && (
            <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        {step > 1 ? (
          <Button variant="ghost" size="md" type="button" onClick={back}>
            Back
          </Button>
        ) : (
          <span />
        )}

        <div className="flex gap-3">
          {(step === 3 || step === 4) && (
            <Button variant="secondary" size="md" type="button" onClick={() => setStep((s) => s + 1)}>
              Skip
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button variant="primary" size="md" type="button" onClick={next}>
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              type="button"
              isLoading={submitting}
              onClick={handleSubmit}
            >
              Save profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
