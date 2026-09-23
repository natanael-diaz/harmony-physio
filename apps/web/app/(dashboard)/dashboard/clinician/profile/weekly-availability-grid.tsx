"use client";

import type { WeeklyAvailability, AvailabilitySlot } from "@harmony/db";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

type Day = (typeof DAYS)[number]["key"];

type Props = {
  value: WeeklyAvailability;
  onChange: (v: WeeklyAvailability) => void;
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function hasOverlap(slots: AvailabilitySlot[], idx: number): boolean {
  const slot = slots[idx]!;
  const aStart = timeToMinutes(slot.start);
  const aEnd = timeToMinutes(slot.end);
  return slots.some((other, i) => {
    if (i === idx) return false;
    const bStart = timeToMinutes(other.start);
    const bEnd = timeToMinutes(other.end);
    return aStart < bEnd && bStart < aEnd;
  });
}

export function WeeklyAvailabilityGrid({ value, onChange }: Props) {
  function addSlot(day: Day) {
    const existing = value[day] ?? [];
    onChange({ ...value, [day]: [...existing, { start: "09:00", end: "17:00" }] });
  }

  function removeSlot(day: Day, idx: number) {
    const updated = (value[day] ?? []).filter((_, i) => i !== idx);
    onChange({ ...value, [day]: updated.length ? updated : undefined });
  }

  function updateSlot(day: Day, idx: number, field: "start" | "end", val: string) {
    const updated = (value[day] ?? []).map((s, i) =>
      i === idx ? { ...s, [field]: val } : s
    );
    onChange({ ...value, [day]: updated });
  }

  return (
    <div className="space-y-3">
      {DAYS.map(({ key, label }) => {
        const slots = value[key] ?? [];
        return (
          <div key={key} className="rounded-lg border border-ink-100 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-ink-700">{label}</span>
              <button
                type="button"
                onClick={() => addSlot(key)}
                className="text-xs font-medium text-peri-600 hover:text-peri-700"
              >
                + Add slot
              </button>
            </div>

            {slots.length === 0 && (
              <p className="text-xs text-ink-400">No availability set</p>
            )}

            <div className="space-y-2">
              {slots.map((slot, idx) => {
                const invalidOrder = timeToMinutes(slot.start) >= timeToMinutes(slot.end);
                const overlap = !invalidOrder && hasOverlap(slots, idx);
                const hasError = invalidOrder || overlap;

                return (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.start}
                      onChange={(e) => updateSlot(key, idx, "start", e.target.value)}
                      className={[
                        "rounded border px-2 py-1 text-sm",
                        hasError ? "border-rose-400 bg-rose-50" : "border-ink-200",
                      ].join(" ")}
                    />
                    <span className="text-xs text-ink-400">to</span>
                    <input
                      type="time"
                      value={slot.end}
                      onChange={(e) => updateSlot(key, idx, "end", e.target.value)}
                      className={[
                        "rounded border px-2 py-1 text-sm",
                        hasError ? "border-rose-400 bg-rose-50" : "border-ink-200",
                      ].join(" ")}
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(key, idx)}
                      className="text-ink-400 hover:text-rose-600"
                      aria-label="Remove slot"
                    >
                      ×
                    </button>
                    {invalidOrder && (
                      <span className="text-xs text-rose-600">Start must be before end</span>
                    )}
                    {overlap && (
                      <span className="text-xs text-rose-600">Overlaps with another slot</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
