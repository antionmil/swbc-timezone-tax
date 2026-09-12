import { ImageResponse } from "next/og";
import { DEFAULT_HOURS, clock } from "@/lib/tz";
import type { Hours } from "@/lib/tz";
import { buildVerdict } from "@/lib/verdict";
import { hourColor } from "@/lib/ramp";
import { cityOf, zoneFromSlug } from "@/lib/zones";

export const runtime = "nodejs";

/**
 * THE FONT TRAP.
 *
 * ImageResponse needs real font bytes — it cannot use a CSS font-family, and a
 * missing font silently falls back to something that looks nothing like the
 * site. Fetch the TTF once per lambda and memoise it. Google's CSS endpoint
 * returns a stylesheet, not a font, so the src URL is parsed out of it first.
 */
let fontCache: ArrayBuffer | null = null;

async function displayFont(): Promise<ArrayBuffer | null> {
  if (fontCache) return fontCache;
  try {
    const cssRes = await fetch(
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap",
      // A modern UA gets woff2, which ImageResponse cannot read. Pretend to be
      // old so Google serves a TTF.
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; SWBC/1.0)" } },
    );
    const css = await cssRes.text();
    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!url) return null;
    fontCache = await (await fetch(url)).arrayBuffer();
    return fontCache;
  } catch {
    return null; // never let a font failure take down the image
  }
}

const wrap = (m: number) => ((m % 1440) + 1440) % 1440;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const you = zoneFromSlug(searchParams.get("you") ?? "") ?? "Europe/London";
  const them = zoneFromSlug(searchParams.get("them") ?? "") ?? "America/New_York";

  let hours: Hours = DEFAULT_HOURS;
  const h = /^(\d{1,2})-(\d{1,2})$/.exec(searchParams.get("h") ?? "");
  if (h && Number(h[2]) > Number(h[1])) hours = { start: Number(h[1]) * 60, end: Number(h[2]) * 60 };

  const now = new Date();
  const v = buildVerdict(you, them, [now.getFullYear(), now.getMonth(), now.getDate()], hours);
  const font = await displayFont();

  const CELL = 44;
  const row = (shift: number) =>
    Array.from({ length: 24 }, (_, i) => {
      const local = wrap(i * 60 + shift);
      const working = local >= hours.start && local < hours.end;
      return (
        <div
          key={`${shift}-${i}`}
          style={{
            display: "flex",
            width: CELL,
            height: 52,
            background: hourColor(Math.floor(local / 60)),
            opacity: working ? 1 : 0.38,
          }}
        />
      );
    });

  const shared = v.today.you;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0c14",
          color: "#f0ece6",
          padding: 64,
          fontFamily: font ? "Display" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, color: "#f6d98a", letterSpacing: 4 }}>
          TIMEZONE TAX
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 62, lineHeight: 1.05 }}>{v.headline}</div>
          <div style={{ display: "flex", fontSize: 27, color: "#a7adbd" }}>
            {cityOf(you)} and {cityOf(them)} · {clock(hours.start)}–{clock(hours.end)} each side
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ display: "flex" }}>{row(0)}</div>
          <div style={{ display: "flex", height: 3 }} />
          <div style={{ display: "flex" }}>{row(v.today.gap)}</div>
          {shared ? (
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: -4,
                bottom: -4,
                left: (shared[0] / 60) * CELL,
                width: ((shared[1] - shared[0]) / 60) * CELL,
                /* White, like the marker on the page: the hour scale is
                   already gold, so a gold box on gold is invisible. */
                border: "3px solid #f0ece6",
                background: "rgba(240,236,230,0.12)",
              }}
            />
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#a7adbd" }}>
          <div style={{ display: "flex" }}>
            {Math.round(v.year.hours)} hours together in {v.year.year}
          </div>
          <div style={{ display: "flex" }}>timezonetax.onedaybuilt.com</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: font ? [{ name: "Display", data: font, style: "normal", weight: 700 }] : [],
      /* Without this the image is regenerated for every crawler that looks at
         a shared link, font fetch and all, and the route measures MISS on
         every request. The picture only changes when a clock changes. */
      headers: {
        "cache-control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
