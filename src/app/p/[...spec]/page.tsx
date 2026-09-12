import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Masthead, Colophon } from "@/components/Chrome";
import { Tax } from "@/components/Tax";
import { EXAMPLES } from "@/lib/examples";
import { DEFAULT_HOURS, clock } from "@/lib/tz";
import type { Hours } from "@/lib/tz";
import { buildVerdict } from "@/lib/verdict";
import { cityOf, slugOf, zoneFromSlug } from "@/lib/zones";

/* A dynamic segment caches nothing on its own. It needs BOTH of these: the
   list of paths to build ahead of time, and a revalidate window for every
   other pair, which renders once on demand and is then served from the edge.
   Day 2 shipped this route shape with only the second half and served
   `no-store` to every shared link for a day. */
export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return EXAMPLES.map(([you, them]) => ({ spec: [`${slugOf(you)}--${slugOf(them)}`] }));
}

type Parsed = { you: string; them: string; hours: Hours };

function parse(spec: string[]): Parsed | null {
  if (!spec.length || spec.length > 2) return null;
  const [a, b, ...rest] = spec[0].split("--");
  if (rest.length || !a || !b) return null;
  const you = zoneFromSlug(a);
  const them = zoneFromSlug(b);
  if (!you || !them) return null;

  let hours = DEFAULT_HOURS;
  if (spec[1]) {
    const m = /^(\d{1,2})-(\d{1,2})$/.exec(spec[1]);
    if (!m) return null;
    const start = Number(m[1]) * 60;
    const end = Number(m[2]) * 60;
    if (!(start >= 0 && end <= 1440 && end - start >= 60)) return null;
    hours = { start, end };
  }
  return { you, them, hours };
}

const today = (): [number, number, number] => {
  const d = new Date();
  return [d.getFullYear(), d.getMonth(), d.getDate()];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ spec: string[] }>;
}): Promise<Metadata> {
  const parsed = parse((await params).spec);
  if (!parsed) return { title: "Not a pair" };
  const v = buildVerdict(parsed.you, parsed.them, today(), parsed.hours);

  const title = v.summary[0].toUpperCase() + v.summary.slice(1);
  const description = `${v.headline} ${v.lede} ${v.yearNote}`;
  const og = `/api/og?you=${slugOf(parsed.you)}&them=${slugOf(parsed.them)}&h=${parsed.hours.start / 60}-${parsed.hours.end / 60}`;

  return {
    title,
    description,
    alternates: { canonical: `/p/${slugOf(parsed.you)}--${slugOf(parsed.them)}` },
    openGraph: { title, description, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}

export default async function Pair({ params }: { params: Promise<{ spec: string[] }> }) {
  const parsed = parse((await params).spec);
  if (!parsed) notFound();

  const ymd = today();
  const v = buildVerdict(parsed.you, parsed.them, ymd, parsed.hours);
  const others = EXAMPLES.filter(([a, b]) => a !== parsed.you || b !== parsed.them).slice(0, 6);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-5 py-10 sm:px-8 sm:py-14">
      <Masthead />
      <Tax initial={{ ...parsed, ymd }} />

      {/* Plain text for anything that does not run JavaScript, and a
          straight answer for anyone who arrives from a shared link. */}
      <section className="sr-only">
        <h2>{v.summary}</h2>
        <p>
          {v.gapLine} {v.lede} A working day of {clock(parsed.hours.start)} to{" "}
          {clock(parsed.hours.end)} in {cityOf(parsed.you)} and in {cityOf(parsed.them)} leaves{" "}
          {v.stats[0].value} together. {v.yearNote}
        </p>
      </section>

      <section className="flex flex-col gap-4 border-t border-rule pt-9">
        <h2 className="text-[11px] tracking-[0.14em] text-muted uppercase">Another pair</h2>
        <ul className="grid gap-x-8 sm:grid-cols-2">
          {others.map(([a, b]) => (
            <li key={`${a}-${b}`}>
              <Link
                href={`/p/${slugOf(a)}--${slugOf(b)}`}
                className="group flex items-baseline justify-between gap-4 border-b border-rule py-3"
              >
                <span className="group-hover:text-accent">
                  {cityOf(a)} <span className="text-muted">and</span> {cityOf(b)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Colophon />
    </main>
  );
}
