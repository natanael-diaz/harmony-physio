"use client";

import { Button } from "@harmony/ui";
import type { WeeklyAvailability } from "@harmony/db";
import { useState } from "react";

import type { ClinicianProfileData } from "./actions";
import { upsertClinicianProfileAction } from "./actions";
import { WeeklyAvailabilityGrid } from "./weekly-availability-grid";

const SPECIALIZATIONS = [
  "Musculoskeletal",
  "Sports Injury",
  "Neurological",
  "Paediatric",
  "Respiratory",
  "Women's Health",
  "Post-operative",
  "Elderly Care",
];

const HCPC_RE = /^[A-Z]{2}\d{6}$/i;

type Props = {
  initial?: Partial<ClinicianProfileData> | undefined;
};

export function ClinicianProfileForm({ initial }: Props) {
  const [hcpc, setHcpc] = useState(initial?.hcpcRegistrationNumber ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [qualifications, setQualifications] = useState(initial?.qualifications ?? "");
  const [specializations, setSpecializations] = useState<string[]>(
    initial?.specializations ?? [],
  );
  const [availability, setAvailability] = useState<WeeklyAvailability>(
    initial?.availabilitySlots ?? {},
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [acceptingNew, setAcceptingNew] = useState(
    initial?.acceptingNewPatients ?? true,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggleSpecialization(s: string) {
    setSpecializations((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!hcpc.trim()) errs.hcpc = "HCPC registration number is required.";
    else if (!HCPC_RE.test(hcpc.trim()))
      errs.hcpc = "Format: 2 letters + 6 digits (e.g. PH123456).";
    if (bio.length > 500) errs.bio = "Bio must be 500 characters or fewer.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSubmitError(null);
    setSaved(false);
    try {
      const result = await upsertClinicianProfileAction({
        hcpcRegistrationNumber: hcpc.trim().toUpperCase(),
        ...(bio ? { bio } : {}),
        ...(qualifications ? { qualifications } : {}),
        specializations,
        availabilitySlots: availability,
        isActive,
        acceptingNewPatients: acceptingNew,
      });
      if (result.ok) {
        setSaved(true);
      } else {
        setSubmitError(result.error);
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section 1 — HCPC Registration */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-ink-900">HCPC Registration</h2>
        <div>
          <label htmlFor="hcpc" className="mb-1.5 block text-sm font-medium text-ink-700">
            Registration number <span className="text-rose-600">*</span>
          </label>
          <input
            id="hcpc"
            type="text"
            placeholder="PH123456"
            value={hcpc}
            onChange={(e) => setHcpc(e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 placeholder-ink-400 shadow-sm focus:border-peri-500 focus:outline-none focus:ring-2 focus:ring-peri-500/20"
          />
          <p className="mt-1 text-xs text-ink-500">Format: 2 letters + 6 digits</p>
          {errors.hcpc && <p className="mt-1 text-xs text-rose-600">{errors.hcpc}</p>}
        </div>
      </section>

      {/* Section 2 — Bio & Qualifications */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-ink-900">Bio &amp; Qualifications</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-ink-700">
              Bio
            </label>
            <textarea
              id="bio"
              rows={4}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="block w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 placeholder-ink-400 shadow-sm focus:border-peri-500 focus:outline-none focus:ring-2 focus:ring-peri-500/20"
              placeholder="A short professional bio visible to patients…"
            />
            <p className={["mt-1 text-xs", bio.length > 480 ? "text-rose-600" : "text-ink-400"].join(" ")}>
              {bio.length}/500
            </p>
            {errors.bio && <p className="mt-1 text-xs text-rose-600">{errors.bio}</p>}
          </div>
          <div>
            <label htmlFor="qualifications" className="mb-1.5 block text-sm font-medium text-ink-700">
              Qualifications
            </label>
            <textarea
              id="qualifications"
              rows={3}
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              className="block w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 placeholder-ink-400 shadow-sm focus:border-peri-500 focus:outline-none focus:ring-2 focus:ring-peri-500/20"
              placeholder="BSc Physiotherapy (Hons), MCSP, HCPC registered…"
            />
          </div>
        </div>
      </section>

      {/* Section 3 — Specializations */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-ink-900">Specializations</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SPECIALIZATIONS.map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={specializations.includes(s)}
                onChange={() => toggleSpecialization(s)}
                className="h-4 w-4 rounded border-ink-300 text-peri-600 focus:ring-peri-500"
              />
              {s}
            </label>
          ))}
        </div>
      </section>

      {/* Section 4 — Availability */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-ink-900">Weekly Availability</h2>
        <WeeklyAvailabilityGrid value={availability} onChange={setAvailability} />
      </section>

      {/* Section 5 — Status */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-ink-900">Status</h2>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-ink-300 text-peri-600 focus:ring-peri-500"
            />
            Active (visible in the system)
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={acceptingNew}
              onChange={(e) => setAcceptingNew(e.target.checked)}
              className="h-4 w-4 rounded border-ink-300 text-peri-600 focus:ring-peri-500"
            />
            Accepting new patients
          </label>
        </div>
      </section>

      {submitError && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</p>
      )}
      {saved && (
        <p className="rounded-lg bg-mint-50 px-4 py-3 text-sm text-mint-700">Profile saved successfully.</p>
      )}

      <Button variant="primary" size="md" type="submit" isLoading={saving}>
        Save profile
      </Button>
    </form>
  );
}
