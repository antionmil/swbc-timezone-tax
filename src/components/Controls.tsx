"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cityOf, countryOf, searchZones } from "@/lib/zones";
import { clock } from "@/lib/tz";
import type { Hours } from "@/lib/tz";

const field =
  "w-full rounded-lg border border-edge bg-raised px-3 py-2.5 font-body text-[15px] text-ink " +
  "placeholder:text-muted focus:border-accent focus:outline-none";

/* A typed field, not a menu.
 *
 * Four hundred and seventeen cities is a list nobody scrolls, and the thing
 * people know is the COUNTRY — "they are in Germany" — not which city the
 * IANA database happens to name the zone after. So the field takes either,
 * and every row shows both. */
export function ZonePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (zone: string) => void;
}) {
  /* null means "not being typed in", and the field shows the chosen place. */
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => searchZones(query ?? ""), [query]);
  const chosen = value ? `${cityOf(value)} · ${countryOf(value)}` : "";

  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (zone: string) => {
    onChange(zone);
    setQuery(null);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + matches.length) % Math.max(matches.length, 1));
    } else if (e.key === "Enter") {
      if (open && matches[active]) {
        e.preventDefault();
        pick(matches[active].zone);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(null);
    }
  };

  return (
    <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={`${listId}-input`} className="text-[11px] tracking-[0.14em] text-muted uppercase">
        {label}
      </label>

      <input
        id={`${listId}-input`}
        ref={inputRef}
        className={field}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        placeholder={chosen || "City or country"}
        value={query ?? chosen}
        onFocus={() => {
          setQuery("");
          setActive(0);
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery(null);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />

      {open ? (
        <div className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-lg border border-edge bg-surface shadow-[0_24px_48px_-24px_rgba(0,0,0,0.9)]">
          {!query ? (
            <p className="border-b border-rule px-3 py-2 text-[11px] tracking-[0.12em] text-muted uppercase">
              Often asked for
            </p>
          ) : null}

          {matches.length ? (
            <ul ref={listRef} id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
              {matches.map((m, i) => (
                <li
                  key={m.zone}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  /* Keep the focus in the input, or the field blurs and the
                     list closes before the click ever lands. */
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(m.zone)}
                  className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-[15px] ${
                    i === active ? "bg-raised text-accent" : ""
                  }`}
                >
                  <span className="truncate">{m.city}</span>
                  <span className="shrink-0 text-[12px] text-muted">{m.country}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-[14px] text-muted">
              Nothing matches &ldquo;{query}&rdquo;. Try the country instead.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

const HOURS = Array.from({ length: 25 }, (_, i) => i * 60);

const select =
  "w-full rounded-lg border border-edge bg-raised px-3 py-2.5 pr-8 font-body text-[15px] text-ink " +
  "focus:border-accent focus:outline-none";

export function HoursPicker({ value, onChange }: { value: Hours; onChange: (h: Hours) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] tracking-[0.14em] text-muted uppercase">Working day</span>
      <div className="flex items-center gap-2">
        <select
          className={select}
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
          className={select}
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
