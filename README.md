# Timezone tax — day 10 of 26

Two places, two working days. How many hours you actually share, what the gap
takes out of a year, and the handful of weekdays when the clocks hand an hour
back.

Live at **timezonetax.onedaybuilt.com**.

## What it computes

Everything comes out of `src/lib/tz.ts`, which reads the IANA timezone
database that ships inside the JavaScript runtime.

| Figure | How |
|---|---|
| Hours shared today | The intersection of the two working windows, in UTC, with their day tried one calendar day either side so the date line is not a wall. |
| Hours shared this year | The same calculation for all 365 days; weekdays summed. |
| Working days a year with nobody there | Weekdays × the working day, minus the hours shared. |
| How long a message waits | Sent at the LAST MINUTE WORKED, not at the boundary. Sending at exactly 17:00 is outside a 09:00–17:00 day, so a colleague in your own city would otherwise come out as a 16-hour wait — true, and nothing to do with timezones. |
| What a usable overlap costs | Brute force in ten-minute steps, both sides, because the window can sit at either end of either day and a closed form can quietly get the direction wrong. |

Offsets are read at LOCAL NOON of each day. Clocks change in the small hours,
so noon is the hour that describes the working day either side of a
transition; reading the offset at 12:00 UTC instead puts the March and October
boundaries a day out for anyone far from Greenwich.

## No database, no API, no key

Nothing is stored and nothing is sent anywhere. The arithmetic runs in the
visitor's browser as they move the pickers, and on the server when a share
link is rendered — the same module both times, so the two cannot disagree.

## Routes

| Route | Mode | Why |
|---|---|---|
| `/` | static, `revalidate = 86400` | The only thing that ages is the hour count beside each example pair, which moves when a clock changes. |
| `/p/[...spec]` | SSG + ISR, `revalidate = 86400` | `generateStaticParams` builds the twelve pairs in `src/lib/examples.ts`; any other pair renders once on demand and is cached from then on. **A dynamic segment caches nothing without both of those** — day 2 shipped this route shape with only the revalidate and served `no-store` to every shared link for a day. |
| `/api/og` | dynamic | An image per pair, drawn with the same band as the page. |

`/p/europe-paris--america-new-york` is the whole state. A working day other
than 09:00–17:00 adds a second segment: `/p/europe-paris--america-new-york/8-20`.

## The zone list is frozen

`src/lib/zones.data.ts` is a snapshot of `Intl.supportedValuesOf("timeZone")`.
It is frozen because Node and the browsers disagree about which alias is
canonical — Chrome says `America/Argentina/Buenos_Aires`, Node says
`America/Buenos_Aires` — and a menu built from the live runtime renders
different options on the server and in the browser, which React treats as a
hydration error.

The frozen list carries the old spellings (`Asia/Calcutta`, `Europe/Kiev`),
because IANA identifiers are never renamed once issued. `RENAMED` in
`src/lib/zones.ts` corrects the LABEL only; both spellings resolve in a URL.

## Colour

One palette, `src/app/globals.css`, with the contrast ratio of every text
token written down against both of the backgrounds it sits on. The site is
dark and only dark: the whole page is a picture of night and daylight.

The 24 hour colours in `src/lib/ramp.ts` are a DATA scale, not theme tokens —
the colour means "it is 04:00 there". Nothing depends on colour alone: every
cell states its hour and the shared window is marked with a border as well.
That border is white, not the accent: daylight on the hour scale is already
gold, and a gold box around gold cells is a box nobody can see.

## Running it

```
pnpm install
pnpm dev            # localhost:3018
pnpm build:check    # builds into .next-build, never disturbs a running dev server
```
