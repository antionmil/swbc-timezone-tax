"use client";

import { COMMON, REGIONS, cityOf, zonesIn } from "@/lib/zones";
import { clock } from "@/lib/tz";
import type { Hours } from "@/lib/tz";

const field =
  "w-full rounded-lg border border-edge bg-raised px-3 py-2.5 pr-8 font-body text-[15px] text-ink " +
  "focus:border-accent focus:outline-none";

/** Two zones have the same city name often enough to matter: America/Indiana/Knox. */
const optionLabel = (zone: string) => {
  const parts = zone.split("/");
  return parts.length > 2 ? `${cityOf(zone)} (${parts[1].replace(/_/g, " ")})` : cityOf(zone);
};

export function ZonePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (zone: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-[11px] tracking-[0.14em] text-muted uppercase">{label}</span>
      <select className={field} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          Choose a place
        </option>
        <optgroup label="Often asked for">
          {COMMON.map((z) => (
            <option key={`c-${z}`} value={z}>
              {optionLabel(z)}
            </option>
          ))}
        </optgroup>
        {REGIONS.map((region) => (
          <optgroup key={region} label={region}>
            {zonesIn(region).map((z) => (
              <option key={z} value={z}>
                {optionLabel(z)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

const HOURS = Array.from({ length: 25 }, (_, i) => i * 60);

export function HoursPicker({ value, onChange }: { value: Hours; onChange: (h: Hours) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] tracking-[0.14em] text-muted uppercase">Working day</span>
      <div className="flex items-center gap-2">
        <select
          className={field}
          value={value.start}
          onChange={(e) => {
            const start = Number(e.target.value);
            onChange({ start, end: Math.max(start + 60, value.end) });
          }}
          aria-label="Working day starts"
        >
          {HOURS.slice(0, 24).map((m) => (
            <option key={m} value={m}>
              {clock(m)}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted">to</span>
        <select
          className={field}
          value={value.end}
          onChange={(e) => {
            const end = Number(e.target.value);
            onChange({ start: Math.min(value.start, end - 60), end });
          }}
          aria-label="Working day ends"
        >
          {HOURS.slice(1).map((m) => (
            <option key={m} value={m}>
              {clock(m)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
