/* The list of places.
 *
 * ZONES is a frozen copy of the IANA list (see zones.data.ts for why it is
 * frozen and not read from the runtime). Everything else here is naming and
 * URL handling. */

import { COUNTRY, COUNTRY_NAME, ZONES } from "./zones.data";

export const ALL = ZONES;

/* The frozen list carries the OLD canonical spellings — Asia/Calcutta,
 * Europe/Kiev, Asia/Saigon — because IANA identifiers are deliberately never
 * renamed once issued. Nobody types Calcutta into a timezone picker in 2026,
 * so the name shown on screen is corrected here. The identifier is untouched,
 * only the label changes, and both spellings resolve in a URL. */
const RENAMED: Record<string, string> = {
  "Asia/Calcutta": "Kolkata",
  "Asia/Saigon": "Ho Chi Minh City",
  "Asia/Rangoon": "Yangon",
  "Asia/Katmandu": "Kathmandu",
  "Europe/Kiev": "Kyiv",
  "Africa/Asmera": "Asmara",
  "America/Godthab": "Nuuk",
  "America/St_Johns": "St. John's",
  "Atlantic/Faeroe": "Faroe Islands",
  "Pacific/Truk": "Chuuk",
  "Pacific/Ponape": "Pohnpei",
  "Pacific/Enderbury": "Kanton",
};

/** "America/Argentina/Buenos_Aires" -> "Buenos Aires" */
export const cityOf = (zone: string) =>
  RENAMED[zone] ?? zone.split("/").pop()!.replace(/_/g, " ").replace(/^St /, "St. ");

/** "America/Argentina/Buenos_Aires" -> "America · Argentina" */
export const regionOf = (zone: string) =>
  zone.split("/").slice(0, -1).join(" · ").replace(/_/g, " ") || "Worldwide";

/** "Europe/Paris" -> "France" */
export const countryOf = (zone: string) => COUNTRY_NAME[COUNTRY[zone]] ?? regionOf(zone);

export const REGIONS = [...new Set(ALL.map((z) => z.split("/")[0]))].sort();

export const zonesIn = (region: string) => ALL.filter((z) => z.split("/")[0] === region);

/* URL slugs. A share link says where it points without a lookup table in the
   middle: /p/europe-paris--america-new-york */
const dashes = (text: string) =>
  text.toLowerCase().replace(/['.]/g, "").replace(/[\s/_]+/g, "-");

const rawSlug = (zone: string) => dashes(zone);

/** The slug a link uses: the city as it is spelled today. */
export const slugOf = (zone: string) =>
  RENAMED[zone] ? dashes(`${zone.split("/")[0]}/${RENAMED[zone]}`) : rawSlug(zone);

const bySlug = new Map<string, string>();
for (const z of ALL) {
  bySlug.set(rawSlug(z), z);
  bySlug.set(slugOf(z), z);
}

/* Resolve a slug back to a zone.
 *
 * The fallback exists because the runtimes disagree about aliases. Chrome
 * makes the slug america-argentina-buenos-aires; this list holds
 * America/Buenos_Aires. The country directory sits in the MIDDLE of the id, so
 * dropping leading words one at a time and matching on the city finds it. */
export function zoneFromSlug(slug: string): string | null {
  const s = dashes(slug);
  const exact = bySlug.get(s);
  if (exact) return exact;

  const parts = s.split("-");
  const region = parts[0];
  for (let k = 1; k < parts.length; k++) {
    const city = parts.slice(k).join("-");
    const hit = ALL.find(
      (z) =>
        z.split("/")[0].toLowerCase() === region &&
        (dashes(z.split("/").pop()!) === city || dashes(cityOf(z)) === city),
    );
    if (hit) return hit;
  }
  return null;
}

export const isZone = (zone: string | null | undefined): zone is string =>
  !!zone && zoneFromSlug(slugOf(zone)) !== null;

/** Whatever the browser reports, mapped onto the frozen list. */
export function detectZone(): string | null {
  try {
    return zoneFromSlug(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return null;
  }
}

/* Top of the menu. Written with the names people use, then resolved through
   the same alias map a URL goes through — Kolkata and Kyiv are not in the
   frozen list under those spellings. */
export const COMMON: string[] = [
  "Europe/London", "Europe/Dublin", "Europe/Lisbon", "Europe/Paris", "Europe/Madrid",
  "Europe/Berlin", "Europe/Amsterdam", "Europe/Zurich", "Europe/Stockholm", "Europe/Warsaw",
  "Europe/Athens", "Europe/Istanbul", "Europe/Kyiv", "Europe/Moscow",
  "America/New_York", "America/Toronto", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Vancouver", "America/Mexico_City", "America/Bogota",
  "America/Sao_Paulo", "America/Buenos_Aires",
  "Africa/Lagos", "Africa/Cairo", "Africa/Nairobi", "Africa/Johannesburg",
  "Asia/Jerusalem", "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka",
  "Asia/Bangkok", "Asia/Jakarta", "Asia/Singapore", "Asia/Manila", "Asia/Hong_Kong",
  "Asia/Shanghai", "Asia/Seoul", "Asia/Tokyo",
  "Australia/Perth", "Australia/Brisbane", "Australia/Melbourne", "Australia/Sydney",
  "Pacific/Auckland", "Pacific/Honolulu",
]
  .map((name) => zoneFromSlug(name))
  .filter((z): z is string => z !== null);

/* ---------------------------------------------------------------- search --
 *
 * The list is 417 cities nobody can scroll, so the field is typed into. What
 * people type is a country — "germany", not "Europe/Busingen" — which is why
 * the country map is generated at all.
 */

/** Fold accents, so "sao paulo" finds São Paulo and "turkiye" finds Türkiye. */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/* CLDR gives one name per country and it is the formal one. Nobody looking
   for a New York colleague types "United States", and Türkiye is spelled
   Turkey by most of the people searching for it. */
const ALIASES: Record<string, string> = {
  US: "usa us america states",
  GB: "uk britain england scotland wales northern ireland",
  AE: "uae emirates",
  NL: "holland",
  CZ: "czech republic",
  TR: "turkey",
  CI: "ivory coast",
  MM: "burma",
  KR: "korea",
  CH: "swiss",
  VA: "holy see",
  RU: "russian federation",
};

type Entry = {
  zone: string;
  city: string;
  country: string;
  /** the informal names for this country, as separate words */
  aliases: string[];
  terms: string;
  common: boolean;
};

let index: Entry[] | null = null;

function entries(): Entry[] {
  if (index) return index;
  const common = new Set(COMMON);
  index = ALL.map((zone) => {
    const city = cityOf(zone);
    const country = countryOf(zone);
    const code = COUNTRY[zone];
    const aliases = fold(ALIASES[code] ?? "").split(" ").filter(Boolean);
    return {
      zone,
      city,
      country,
      aliases,
      terms: fold(`${city} ${country} ${zone.replace(/[/_]/g, " ")} ${aliases.join(" ")}`),
      common: common.has(zone),
    };
  });
  return index;
}

export type Match = { zone: string; city: string; country: string };

/* Ranked, not filtered. A city whose name STARTS with what has been typed is
   what the typist meant; a country match comes next; anything else is a
   fallback. Without the ranking, typing "ind" answers Indianapolis before
   India, and "par" answers Paramaribo before Paris. */
export function searchZones(query: string, limit = 60): Match[] {
  const q = fold(query);
  const all = entries();
  const pool = q ? all : all.filter((e) => e.common);

  const scored = pool
    .map((e) => {
      if (!q) return { e, score: 0 };
      const city = fold(e.city);
      const country = fold(e.country);
      if (city === q) return { e, score: 0 };
      /* An informal country name beats everything except an exact city,
         because it can only have been typed on purpose. Ranked below the city
         prefix instead, "usa" answers Jerusalem and Lusaka — both of which
         contain the letters — and "uk" answers Ukraine before London. */
      if (e.aliases.includes(q)) return { e, score: 1 };
      if (city.startsWith(q)) return { e, score: 2 };
      if (country.startsWith(q)) return { e, score: 3 };
      if (e.aliases.some((a) => a.startsWith(q))) return { e, score: 4 };
      if (city.includes(q)) return { e, score: 5 };
      if (country.includes(q)) return { e, score: 6 };
      if (e.terms.includes(q)) return { e, score: 7 };
      return { e, score: -1 };
    })
    .filter((x) => x.score >= 0);

  scored.sort(
    (a, b) =>
      a.score - b.score ||
      Number(b.e.common) - Number(a.e.common) ||
      a.e.city.localeCompare(b.e.city),
  );

  return scored.slice(0, limit).map(({ e }) => ({ zone: e.zone, city: e.city, country: e.country }));
}
