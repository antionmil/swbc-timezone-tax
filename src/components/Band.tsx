import type { Verdict } from "@/lib/verdict";
import { clock, niceHours } from "@/lib/tz";
import { hourColor, rampInk } from "@/lib/ramp";
import { cityOf } from "@/lib/zones";

const pct = (minutes: number) => `${(minutes / 1440) * 100}%`;
const wrap = (m: number) => ((m % 1440) + 1440) % 1440;

function Row({
  zone,
  shift,
  start,
  end,
}: {
  zone: string;
  /** minutes this row's clock is ahead of the row above */
  shift: number;
  start: number;
  end: number;
}) {
  return (
    <div className="grid grid-cols-24">
      {Array.from({ length: 24 }, (_, i) => {
        const local = wrap(i * 60 + shift);
        const working = local >= start && local < end;
        const hour = Math.floor(local / 60);
        return (
          <div
            key={`${zone}-${i}`}
            className={`flex h-9 items-center justify-center border-r border-ground font-mono text-[10px] last:border-r-0 sm:h-11 ${
              working ? "opacity-100" : "opacity-30"
            }`}
            style={{ background: hourColor(hour), color: rampInk(hour) }}
            title={`${cityOf(zone)} ${clock(local)}`}
          >
            <span className="hidden sm:inline">{local % 60 ? clock(local) : String(hour).padStart(2, "0")}</span>
          </div>
        );
      })}
    </div>
  );
}

/** The two working days, laid on one timeline, read on YOUR clock. */
export function Band({ verdict, now }: { verdict: Verdict; now: number | null }) {
  const { you, them, hours, today } = verdict;
  const shared = today.you;

  return (
    <figure className="rounded-xl border border-rule bg-surface p-3 sm:p-5">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted">
        <span className="text-ink">{cityOf(you)} — your clock</span>
        <span>midnight to midnight</span>
      </figcaption>

      <div className="relative">
        <Row zone={you} shift={0} start={hours.start} end={hours.end} />
        <div className="h-px" />
        <Row zone={them} shift={today.gap} start={hours.start} end={hours.end} />

        {/* The marker is WHITE, not the accent colour. Daylight on the hour
            scale is already gold, so a gold box around gold cells is a box
            nobody can see — checked on the real thing, not in a mockup. */}
        {shared ? (
          <div
            className="pointer-events-none absolute inset-y-0 border-x-2 border-ink bg-ink/10"
            style={{ left: pct(shared[0]), width: pct(shared[1] - shared[0]) }}
          />
        ) : null}

        {now !== null ? (
          <div
            className="pointer-events-none absolute -inset-y-1 w-px bg-ink/70"
            style={{ left: pct(now) }}
            aria-hidden
          />
        ) : null}
      </div>

      <div className="relative mt-1.5 h-4">
        {shared ? (
          <div
            className="absolute flex h-full items-center justify-center"
            style={{ left: pct(shared[0]), width: pct(shared[1] - shared[0]) }}
          >
            <span className="font-display text-[11px] font-medium whitespace-nowrap text-ink">
              {niceHours(verdict.today.minutes / 60)} hours together
            </span>
          </div>
        ) : null}
      </div>

      <figcaption className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted">
        <span className="text-ink">{cityOf(them)}</span>
        <span>
          {shared
            ? `${clock(shared[0])}–${clock(shared[1])} here is ${clock(today.them![0])}–${clock(today.them![1])} there`
            : "no hour of the day is a working hour for both of you"}
        </span>
      </figcaption>
    </figure>
  );
}
