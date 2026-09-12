import Link from "next/link";
import { Masthead, Colophon } from "@/components/Chrome";
import { Tax } from "@/components/Tax";
import { EXAMPLES } from "@/lib/examples";
import { DEFAULT_HOURS, niceHours, shareOnDay } from "@/lib/tz";
import { cityOf, slugOf } from "@/lib/zones";

/* Static, and refreshed once a day. The only thing on this page that ages is
   the hour count beside each example pair, which moves when a clock changes,
   so a day is as stale as it can get. Everything a visitor chooses is worked
   out in their own browser. */
export const revalidate = 86400;

export default function Home() {
  const now = new Date();
  const ymd: [number, number, number] = [now.getFullYear(), now.getMonth(), now.getDate()];

  const examples = EXAMPLES.map(([you, them]) => {
    const hours = shareOnDay(you, them, ymd, DEFAULT_HOURS, DEFAULT_HOURS).minutes / 60;
    return {
      href: `/p/${slugOf(you)}--${slugOf(them)}`,
      you: cityOf(you),
      them: cityOf(them),
      label: hours === 0 ? "no shared hour" : `${niceHours(hours)} h a day`,
    };
  });

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-5 py-10 sm:px-8 sm:py-14">
      <Masthead />
      <Tax />

      <section className="flex flex-col gap-4 border-t border-rule pt-9">
        <h2 className="text-[11px] tracking-[0.14em] text-muted uppercase">
          Pairs people keep asking about
        </h2>
        <ul className="grid gap-x-8 sm:grid-cols-2">
          {examples.map((e) => (
            <li key={e.href}>
              <Link
                href={e.href}
                className="group flex items-baseline justify-between gap-4 border-b border-rule py-3"
              >
                <span className="group-hover:text-accent">
                  {e.you} <span className="text-muted">and</span> {e.them}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted">{e.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex max-w-[62ch] flex-col gap-3 text-[15px] leading-relaxed text-body">
        <h2 className="text-[11px] tracking-[0.14em] text-muted uppercase">What this counts</h2>
        <p>
          A working day is eight hours by default, and two working days in different places
          overlap by whatever is left after the distance between the clocks. That remainder is
          the only time you will ever have together: every call, every question that needs an
          answer in the same breath, every decision that cannot wait a day.
        </p>
        <p>
          The rest is the tax. It is paid in evenings, in early mornings, and in questions that
          sit unread overnight — and it is paid every weekday for as long as the arrangement
          lasts, which is why it is worth knowing the number before you agree to it.
        </p>
      </section>

      <Colophon />
    </main>
  );
}
