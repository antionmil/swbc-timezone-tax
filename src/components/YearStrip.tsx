import type { Year } from "@/lib/tz";
import { niceHours } from "@/lib/tz";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* Every weekday of the year, shaded by what it gives you.
 *
 * One hue, so the scale reads as more or less of the same thing rather than
 * as categories. The tooltip carries the exact figure, because colour alone
 * is not a number and nobody should have to guess from a square. */
export function YearStrip({ year, full }: { year: Year; full: number }) {
  const weekdays = year.days.filter((d) => d.weekday);
  const max = Math.max(...weekdays.map((d) => d.hours));
  const min = Math.min(...weekdays.map((d) => d.hours));

  /* Two scales, because two different questions are being asked.
   *
   * When the year varies, the scale runs between the two values this pair
   * actually sees: a year that swings between three hours and four is the
   * interesting case, and on a zero-based scale those two look identical.
   * When every weekday is the same, there is nothing to compare, so the shade
   * has to mean the figure itself — otherwise a pair who share NOTHING get a
   * solid block of gold that reads as a year full of time together. */
  const shade = (hours: number) =>
    max === min ? 0.1 + 0.72 * (hours / full) : 0.1 + 0.9 * ((hours - min) / (max - min));

  const columns: (typeof weekdays)[] = [];
  for (const day of weekdays) {
    if (day.dow === 1 || columns.length === 0) columns.push([]);
    columns[columns.length - 1].push(day);
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[700px]">
        <div className="mb-1 flex gap-[2px] text-[10px] text-muted">
          {columns.map((week, i) => {
            /* One label per month, on the first column that reaches it. */
            const month = week[0].month;
            const previous = i === 0 ? -1 : columns[i - 1][0].month;
            return (
              <span key={i} className="w-[11px] shrink-0 whitespace-nowrap">
                {month === previous ? "" : MONTHS[month]}
              </span>
            );
          })}
        </div>

        <div className="flex gap-[2px]">
          {columns.map((week, i) => (
            <div key={i} className="flex w-[11px] shrink-0 flex-col gap-[2px]">
              {week.map((day) => (
                <span
                  key={day.date}
                  className="block h-[11px] w-[11px] rounded-[2px] bg-accent"
                  style={{ opacity: shade(day.hours) }}
                  title={`${day.date} — ${niceHours(day.hours)} hour${day.hours === 1 ? "" : "s"}`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          {min === max ? (
            <span className="flex items-center gap-2">
              <span className="block h-3 w-3 rounded-[2px] bg-accent" style={{ opacity: shade(min) }} />
              {min === 0 ? "no shared hour, every weekday alike" : `${niceHours(min)} h, every weekday alike`}
            </span>
          ) : (
            <>
              <span className="flex items-center gap-2">
                <span className="block h-3 w-3 rounded-[2px] bg-accent" style={{ opacity: shade(min) }} />
                {niceHours(min)} h
              </span>
              <span className="flex items-center gap-2">
                <span className="block h-3 w-3 rounded-[2px] bg-accent" />
                {niceHours(max)} h
              </span>
            </>
          )}
          <span>one square is one weekday of {year.year}; weekends are not counted</span>
        </div>
      </div>
    </div>
  );
}
