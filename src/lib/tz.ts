/* Timezone maths.
 *
 * Every figure on this site comes out of this file, and this file reads the
 * IANA database that ships inside the JavaScript runtime. No network call, no
 * API key, no table to keep up to date. The same code runs on the server when
 * a share link is rendered and in the browser while the visitor moves the
 * pickers, so the two can never disagree.
 */

const MIN = 60_000;

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(zone: string) {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" });
    formatters.set(zone, f);
  }
  return f;
}

/** UTC offset of a zone, in minutes, at one instant. */
function offsetAt(zone: string, instant: number): number {
  const name =
    formatter(zone).formatToParts(new Date(instant)).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  if (!m) return 0; // plain "GMT" — UTC and the zones pinned to it
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/* Offset in minutes at LOCAL NOON of a calendar day.
 *
 * Local noon, not midnight, and not 12:00 UTC either. Clocks change in the
 * small hours, so noon is the hour that describes the working day on both
 * sides of a transition. Reading the offset at 12:00 UTC instead puts the
 * March and October boundaries a day out for anyone far from Greenwich. */
const offsets = new Map<string, number>();
export function offsetOnDay(zone: string, y: number, m: number, d: number): number {
  const key = `${zone}|${y}-${m}-${d}`;
  const hit = offsets.get(key);
  if (hit !== undefined) return hit;
  const noonUtc = Date.UTC(y, m, d, 12);
  const guess = offsetAt(zone, noonUtc);
  const value = offsetAt(zone, noonUtc - guess * MIN);
  offsets.set(key, value);
  return value;
}

export type Hours = { start: number; end: number }; // local minutes from midnight

export const DEFAULT_HOURS: Hours = { start: 9 * 60, end: 17 * 60 };
export const hoursLength = (h: Hours) => (h.end - h.start) / 60;

export type Share = {
  minutes: number;
  /** the shared window in each side's own local minutes */
  you: [number, number] | null;
  them: [number, number] | null;
  /** how far ahead of you they are, in minutes, on this day */
  gap: number;
};

/** What one calendar day gives the two of you. */
export function shareOnDay(
  a: string,
  b: string,
  [y, m, d]: [number, number, number],
  aw: Hours,
  bw: Hours,
): Share {
  const oa = offsetOnDay(a, y, m, d);
  const ob = offsetOnDay(b, y, m, d);
  const gap = ob - oa;

  // both windows expressed in UTC minutes
  const a0 = aw.start - oa;
  const a1 = aw.end - oa;
  const b0 = bw.start - ob;
  const b1 = bw.end - ob;

  let best = 0;
  let at: [number, number] | null = null;
  // their working day either side of yours: the date line is not a wall
  for (const shift of [-1440, 0, 1440]) {
    const lo = Math.max(a0, b0 + shift);
    const hi = Math.min(a1, b1 + shift);
    if (hi - lo > best) {
      best = hi - lo;
      at = [lo, hi];
    }
  }
  if (!at || best <= 0) return { minutes: 0, you: null, them: null, gap };
  return {
    minutes: best,
    you: [at[0] + oa, at[1] + oa],
    them: [((at[0] + ob) % 1440 + 1440) % 1440, ((at[1] + ob) % 1440 + 1440) % 1440],
    gap,
  };
}

export type YearDay = { date: string; month: number; dow: number; hours: number; gap: number; weekday: boolean };

export type Year = {
  year: number;
  days: YearDay[];
  weekdays: number;
  /** shared hours across every weekday of the year */
  hours: number;
  /** the figure you get on an ordinary weekday */
  usual: number;
  /** weekdays that beat the usual figure, and when they fall */
  bonus: { hours: number; days: number; ranges: [string, string][] } | null;
  /** weekdays that fall short of the usual figure */
  worse: { days: number } | null;
  /** whether each side's own offset moves at all during the year */
  varies: { you: boolean; them: boolean };
  /** every distinct gap between the two clocks, in minutes, smallest first */
  gaps: number[];
};

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Every day of a calendar year, so the clock changes show themselves. */
export function shareOnYear(a: string, b: string, year: number, aw: Hours, bw: Hours): Year {
  const days: YearDay[] = [];
  const cursor = new Date(Date.UTC(year, 0, 1));
  while (cursor.getUTCFullYear() === year) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth();
    const d = cursor.getUTCDate();
    const dow = cursor.getUTCDay();
    const share = shareOnDay(a, b, [y, m, d], aw, bw);
    days.push({
      date: iso(y, m, d),
      month: m,
      dow,
      hours: share.minutes / 60,
      gap: share.gap,
      weekday: dow >= 1 && dow <= 5,
    });
    cursor.setUTCDate(d + 1);
  }

  const work = days.filter((x) => x.weekday);
  const hours = work.reduce((t, x) => t + x.hours, 0);

  // the usual figure is the one most weekdays get, not the average
  const tally = new Map<number, number>();
  for (const x of work) tally.set(x.hours, (tally.get(x.hours) ?? 0) + 1);
  let usual = 0;
  let most = -1;
  for (const [value, count] of tally) if (count > most) ((most = count), (usual = value));

  const better = work.filter((x) => x.hours > usual + 0.01);
  const ranges: [string, string][] = [];
  for (const x of better) {
    const last = ranges[ranges.length - 1];
    if (last && daysBetween(last[1], x.date) <= 3) last[1] = x.date;
    else ranges.push([x.date, x.date]);
  }

  const moves = (zone: string) => {
    const first = offsetOnDay(zone, year, 0, 15);
    return days.some((x) => offsetOnDay(zone, year, x.month, Number(x.date.slice(8, 10))) !== first);
  };

  return {
    year,
    days,
    weekdays: work.length,
    varies: { you: moves(a), them: moves(b) },
    gaps: [...new Set(days.map((x) => x.gap))].sort((p, q) => p - q),
    hours,
    usual,
    bonus: better.length
      ? { hours: Math.max(...better.map((x) => x.hours)), days: better.length, ranges }
      : null,
    worse: work.some((x) => x.hours < usual - 0.01)
      ? { days: work.filter((x) => x.hours < usual - 0.01).length }
      : null,
  };
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/* How long a message sits unread.
 *
 * Sender finishes their working day and writes. The answer cannot arrive
 * before the other one starts work. If the send lands inside the receiver's
 * working hours the wait is zero, which is its own kind of finding: one of
 * you is always the one who waits overnight. */
export function waitHours(
  sender: string,
  receiver: string,
  senderHours: Hours,
  receiverHours: Hours,
  [y, m, d]: [number, number, number],
): number {
  const os = offsetOnDay(sender, y, m, d);
  const or = offsetOnDay(receiver, y, m, d);
  /* The LAST MINUTE WORKED, not the boundary. Sending at exactly 17:00 is
     outside a 09:00-17:00 day, so a colleague in your own city would come out
     as a 16-hour wait — true, and nothing to do with timezones. */
  const sent = senderHours.end - 1 - os; // UTC minutes
  for (const k of [-1, 0, 1, 2]) {
    const open = receiverHours.start - or + 1440 * k;
    const close = receiverHours.end - or + 1440 * k;
    if (sent >= open && sent < close) return 0;
  }
  for (const k of [0, 1, 2]) {
    const open = receiverHours.start - or + 1440 * k;
    if (open >= sent) return (open - sent) / 60;
  }
  return 0;
}

export type Move = { edge: "earlier" | "later"; to: number; cost: number };
export type Stretch = { target: number; you: Move | null; them: Move | null };

/* The move that buys a usable overlap.
 *
 * Brute force in ten-minute steps rather than algebra: the window can sit at
 * either end of either day, and a search that tries every move cannot get the
 * direction wrong the way a closed form quietly can. Both sides are returned,
 * because who pays is the whole question. */
export function stretchTo(
  a: string,
  b: string,
  ymd: [number, number, number],
  aw: Hours,
  bw: Hours,
  target: number,
): Stretch | null {
  const want = target * 60;
  if (shareOnDay(a, b, ymd, aw, bw).minutes >= want - 1) return null;

  const find = (side: "you" | "them"): Move | null => {
    for (let cost = 10; cost <= 10 * 60; cost += 10) {
      for (const edge of ["later", "earlier"] as const) {
        const to = side === "you"
          ? (edge === "later" ? aw.end + cost : aw.start - cost)
          : (edge === "later" ? bw.end + cost : bw.start - cost);
        if (to < 0 || to > 1440) continue;
        const moved = side === "you"
          ? { a: edge === "later" ? { ...aw, end: to } : { ...aw, start: to }, b: bw }
          : { a: aw, b: edge === "later" ? { ...bw, end: to } : { ...bw, start: to } };
        if (shareOnDay(a, b, ymd, moved.a, moved.b).minutes >= want - 1) return { edge, to, cost };
      }
    }
    return null;
  };

  const you = find("you");
  const them = find("them");
  return you || them ? { target, you, them } : null;
}

export const clock = (localMinutes: number) => {
  const m = ((localMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** 2 → "2", 2.5 → "2½", 0.75 → "¾" — hours read better than decimals. */
export function niceHours(h: number): string {
  const whole = Math.floor(h + 1e-9);
  const rest = h - whole;
  const frac = rest > 0.7 ? "¾" : rest > 0.45 ? "½" : rest > 0.2 ? "¼" : "";
  if (!frac) return String(whole);
  return whole === 0 ? frac : `${whole}${frac}`;
}
