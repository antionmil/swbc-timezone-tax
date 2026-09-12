/* Numbers into sentences.
 *
 * Every state the page can be in is written out here rather than hidden in
 * JSX: the pair who share nothing, the pair who share everything, the pair
 * whose gap never moves. A sentence that is only true for the happy case is
 * easy to miss inside a component and obvious in a list. */

import type { Hours, Share, Year } from "./tz";
import {
  DEFAULT_HOURS, clock, hoursLength, niceHours,
  shareOnDay, shareOnYear, stretchTo, waitHours,
} from "./tz";
import { cityOf } from "./zones";

export type Stat = { value: string; label: string };

export type Verdict = {
  you: string;
  them: string;
  hours: Hours;
  ymd: [number, number, number];
  today: Share;
  year: Year;
  gapLine: string;
  headline: string;
  lede: string;
  stats: Stat[];
  stretch: string | null;
  yearNote: string;
  /** one line, for the share card and the page title */
  summary: string;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

const dayOf = (iso: string) => Number(iso.slice(8, 10));
const monthOf = (iso: string) => Number(iso.slice(5, 7)) - 1;
const short = (m: number) => MONTHS[m].slice(0, 3);

function rangeLabel([from, to]: [string, string]) {
  if (from === to) return `${dayOf(from)} ${MONTHS[monthOf(from)]}`;
  if (monthOf(from) === monthOf(to)) return `${dayOf(from)}–${dayOf(to)} ${MONTHS[monthOf(from)]}`;
  return `${dayOf(from)} ${short(monthOf(from))} – ${dayOf(to)} ${short(monthOf(to))}`;
}

const list = (items: string[]) =>
  items.length <= 1 ? items[0] ?? "" : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export function buildVerdict(
  you: string,
  them: string,
  ymd: [number, number, number],
  hours: Hours = DEFAULT_HOURS,
): Verdict {
  const full = hoursLength(hours);
  const today = shareOnDay(you, them, ymd, hours, hours);
  const year = shareOnYear(you, them, ymd[0], hours, hours);
  const theirCity = cityOf(them);
  const yourCity = cityOf(you);
  const shared = today.minutes / 60;

  /* --- how far apart ---------------------------------------------------- */
  const gapH = Math.abs(today.gap) / 60;
  const gapLine =
    you === them
      ? `That is your own timezone.`
      : today.gap === 0
        ? `${theirCity} keeps the same clock as ${yourCity}.`
        : `${theirCity} is ${niceHours(gapH)} hour${gapH === 1 ? "" : "s"} ${
            today.gap > 0 ? "ahead of" : "behind"
          } you today.`;

  /* --- the headline and the line under it -------------------------------- */
  let headline: string;
  let lede: string;
  if (shared === 0) {
    headline = `You never share a working hour.`;
    lede = `There is no minute of the day when you are both at your desk. Every conversation with ${theirCity} costs one of you an evening or a morning.`;
  } else if (shared >= full - 0.01) {
    headline = `You share the whole working day.`;
    lede = today.gap === 0
      ? `Same clock, same hours. There is no tax to pay.`
      : `The clocks differ, the working days do not. Nothing here costs you anything.`;
  } else {
    headline = `You share ${niceHours(shared)} hour${shared === 1 ? "" : "s"} a day.`;
    lede = `Every call you will ever have with ${theirCity} lives in the lit column. On both sides of it, one of you is asleep.`;
  }

  /* --- the four numbers --------------------------------------------------- */
  const soloHours = year.weekdays * full - year.hours;
  const soloDays = Math.round(soloHours / full);
  const waitTheirs = waitHours(them, you, hours, hours, ymd);
  const waitYours = waitHours(you, them, hours, hours, ymd);
  const endLabel = clock(hours.end);

  const waitStat: Stat =
    waitTheirs > 0
      ? { value: `${niceHours(waitTheirs)}h`, label: `their ${endLabel} message waits for you` }
      : waitYours > 0
        ? { value: `${niceHours(waitYours)}h`, label: `your ${endLabel} message waits for them` }
        : { value: "None", label: `neither of you waits overnight for an answer` };

  const stats: Stat[] = [
    {
      value: shared === 0 ? "None" : `${niceHours(shared)}h`,
      label: today.you
        ? `today, ${clock(today.you[0])}–${clock(today.you[1])} your time`
        : `no hour today, or any other day`,
    },
    { value: `${Math.round(year.hours)}h`, label: `together across ${year.weekdays} weekdays in ${year.year}` },
    { value: `${soloDays}`, label: `working days a year with nobody there` },
    waitStat,
  ];

  /* --- what a usable overlap would cost ----------------------------------- */
  const target = Math.min(4, Math.round(full / 2));
  const move = stretchTo(you, them, ymd, hours, hours, target);
  let stretch: string | null = null;
  if (move) {
    const parts: string[] = [];
    if (move.you) parts.push(`you ${move.you.edge === "later" ? "work until" : "start at"} ${clock(move.you.to)}`);
    if (move.them) parts.push(`they ${move.them.edge === "later" ? "work until" : "start at"} ${clock(move.them.to)}`);
    stretch = parts.length
      ? `To share ${target} hours, ${parts.join(", or ")}. Somebody pays, and the only question is who.`
      : null;
  } else if (shared < full - 0.01 && shared > 0) {
    stretch = `You already share ${target} hours or more. That is further than most pairs this far apart ever get.`;
  }

  /* --- the year ----------------------------------------------------------- */
  /* Who actually moves their clocks decides how the sentence reads. Saying
     "the two of you change on different dates" about India, which changes
     nothing, is the kind of confidently wrong line that poisons the rest of
     the page. */
  const reason =
    year.varies.you && year.varies.them
      ? `You change your clocks on different dates.`
      : year.varies.them
        ? `${theirCity} changes its clocks and you do not.`
        : year.varies.you
          ? `You change your clocks and ${theirCity} does not.`
          : `Neither of you changes clocks.`;

  let yearNote: string;
  if (year.bonus) {
    const when = list(year.bonus.ranges.map(rangeLabel));
    const small = year.bonus.days <= 30;
    yearNote = small
      ? `For ${year.bonus.days} weekday${year.bonus.days === 1 ? "" : "s"} a year the gap narrows and you get ${niceHours(year.bonus.hours)} hours instead of ${niceHours(year.usual)} — ${when}. ${reason} Nobody scheduled those hours; they arrive on their own.`
      : `${year.bonus.days} of your ${year.weekdays} weekdays give you ${niceHours(year.bonus.hours)} hours rather than ${niceHours(year.usual)} — ${when}. ${reason} Half the year is a different arrangement from the other half.`;
  } else if (year.worse) {
    yearNote = `${year.worse.days} weekdays a year fall short of the usual ${niceHours(year.usual)} hours. ${reason}`;
  } else {
    /* A gap that never moves can only mean two things: both of you change your
       clocks on the same dates, or neither of you changes them. Anything else
       would have shown up above as a better or a worse week. */
    const same = year.usual === 0
      ? `you share none of it`
      : `you share the same ${niceHours(year.usual)} hour${year.usual === 1 ? "" : "s"}`;

    if (year.gaps.length > 1) {
      /* The clocks DO move apart — Paris and Los Angeles spend 28 days a year
         eight hours apart instead of nine — and it buys nothing, because the
         working days miss each other either way. Saying "the gap never moves"
         here would be false. */
      const spread = year.gaps.map((g) => Math.abs(g) / 60);
      const lo = niceHours(Math.min(...spread));
      const hi = niceHours(Math.max(...spread));
      yearNote = `The distance between your clocks does move, between ${lo} and ${hi} hours, and it buys you nothing: ${same} whichever week it is. ${reason}`;
    } else {
      const steady =
        you === them
          ? ``
          : year.varies.you && year.varies.them
            ? ` You both change your clocks, and on the same dates.`
            : ` Neither of you changes clocks.`;
      yearNote =
        year.usual === 0
          ? `The gap never moves, and neither does the answer. There is no week of the year when this gets easier.${steady}`
          : `The gap never moves. Every weekday of ${year.year} gives you the same ${niceHours(year.usual)} hour${year.usual === 1 ? "" : "s"}, clock changes included.${steady}`;
    }
  }

  const summary =
    shared === 0
      ? `${yourCity} and ${theirCity} never share a working hour`
      : `${yourCity} and ${theirCity} share ${niceHours(shared)} hour${shared === 1 ? "" : "s"} a day`;

  return { you, them, hours, ymd, today, year, gapLine, headline, lede, stats, stretch, yearNote, summary };
}
