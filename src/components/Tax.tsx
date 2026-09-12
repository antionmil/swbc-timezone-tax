"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_HOURS, offsetOnDay } from "@/lib/tz";
import type { Hours } from "@/lib/tz";
import { buildVerdict } from "@/lib/verdict";
import { cityOf, detectZone, slugOf } from "@/lib/zones";
import { Band } from "./Band";
import { YearStrip } from "./YearStrip";
import { HoursPicker, ZonePicker } from "./Controls";
import { Share } from "./Share";

export type Initial = { you: string; them: string; hours: Hours; ymd: [number, number, number] };

const localToday = (): [number, number, number] => {
  const d = new Date();
  return [d.getFullYear(), d.getMonth(), d.getDate()];
};

export function pathFor(you: string, them: string, hours: Hours) {
  const base = `/p/${slugOf(you)}--${slugOf(them)}`;
  const standard = hours.start === DEFAULT_HOURS.start && hours.end === DEFAULT_HOURS.end;
  return standard ? base : `${base}/${hours.start / 60}-${hours.end / 60}`;
}

export function Tax({ initial }: { initial?: Initial }) {
  const [you, setYou] = useState<string | null>(initial?.you ?? null);
  const [them, setThem] = useState<string | null>(initial?.them ?? null);
  const [hours, setHours] = useState<Hours>(initial?.hours ?? DEFAULT_HOURS);
  const [ymd, setYmd] = useState<[number, number, number]>(initial?.ymd ?? localToday());
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  /* On arrival: fill in where the visitor is, and move the date on from
     whenever this page was rendered. A share page can be a day old — with
     `revalidate` it is a day old at most — and the clocks may have changed in
     between. Nothing is shown before this runs, so nothing has to be taken
     back afterwards. */
  useEffect(() => {
    setMounted(true);
    if (!initial) {
      const here = detectZone();
      if (here) setYou((prev) => prev ?? here);
    }
    const today = localToday();
    setYmd((prev) =>
      prev[0] === today[0] && prev[1] === today[1] && prev[2] === today[2] ? prev : today,
    );
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, [initial]);

  const verdict = useMemo(
    () => (you && them ? buildVerdict(you, them, ymd, hours) : null),
    [you, them, ymd, hours],
  );

  /* The address bar always names the pair on the screen, so the back button
     and a copied URL agree with each other. */
  useEffect(() => {
    if (!you || !them) return;
    const path = pathFor(you, them, hours);
    if (window.location.pathname !== path) window.history.replaceState(null, "", path);
  }, [you, them, hours]);

  /* Where "now" falls on your row. Only after mount: the server has no idea
     what time it is where the visitor is. */
  const now = useMemo(() => {
    if (!mounted || !you) return null;
    void tick;
    const utc = Date.now() / 60_000;
    return (((utc + offsetOnDay(you, ymd[0], ymd[1], ymd[2])) % 1440) + 1440) % 1440;
  }, [mounted, you, ymd, tick]);

  const swap = () => {
    if (!you || !them) return;
    setYou(them);
    setThem(you);
  };

  return (
    <>
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <ZonePicker label="You are in" value={you} onChange={setYou} />
          <button
            type="button"
            onClick={swap}
            disabled={!you || !them}
            className="self-center rounded-lg border border-edge px-3 py-2.5 text-muted sm:self-end transition-colors hover:enabled:border-accent hover:enabled:text-accent disabled:opacity-40"
            aria-label="Swap the two places"
            title="Swap"
          >
            ⇄
          </button>
          <ZonePicker label="They are in" value={them} onChange={setThem} />
          <HoursPicker value={hours} onChange={setHours} />
        </div>
      </section>

      {verdict ? (
        <>
          <section className="flex flex-col gap-3">
            <p className="text-sm text-muted">{verdict.gapLine}</p>
            <h1 className="font-display rise text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl">
              {verdict.headline}
            </h1>
            <p className="max-w-[52ch] text-[17px] leading-relaxed text-body">{verdict.lede}</p>
          </section>

          <Band verdict={verdict} now={now} />

          <section className="grid grid-cols-2 gap-x-6 gap-y-7 border-y border-rule py-7 sm:grid-cols-4">
            {verdict.stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-1">
                <span className="font-display text-3xl leading-none font-bold tracking-tight text-accent">
                  {s.value}
                </span>
                <span className="text-[13px] leading-snug text-muted">{s.label}</span>
              </div>
            ))}
          </section>

          {verdict.stretch ? (
            <section className="rounded-xl border border-rule bg-surface p-5">
              <h2 className="mb-2 text-[11px] tracking-[0.14em] text-muted uppercase">
                What a usable overlap costs
              </h2>
              <p className="max-w-[58ch] text-[17px] leading-relaxed">{verdict.stretch}</p>
            </section>
          ) : null}

          <section className="flex flex-col gap-4">
            <h2 className="text-[11px] tracking-[0.14em] text-muted uppercase">
              Every weekday of {verdict.year.year}
            </h2>
            <p className="max-w-[62ch] text-[17px] leading-relaxed text-body">{verdict.yearNote}</p>
            <YearStrip year={verdict.year} full={(hours.end - hours.start) / 60} />
          </section>

          <section className="flex flex-col gap-3">
            <Share path={pathFor(verdict.you, verdict.them, hours)} />
          </section>
        </>
      ) : (
        <section className="flex flex-col gap-3">
          <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl">
            How much of the day do you actually share?
          </h1>
          <p className="max-w-[52ch] text-[17px] leading-relaxed text-body">
            {you
              ? `You are in ${cityOf(you)}. Say where they are and the arithmetic follows: the hours you both have, the hours one of you gives up, and the weeks when the clocks make it better.`
              : "Two places, two working days. The overlap is smaller than anybody plans for, and it is the same two hours for the rest of the arrangement."}
          </p>
        </section>
      )}
    </>
  );
}
