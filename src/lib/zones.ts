/* The list of places.
 *
 * ZONES is a frozen copy of the IANA list (see zones.data.ts for why it is
 * frozen and not read from the runtime). Everything else here is naming and
 * URL handling. */

import { ZONES } from "./zones.data";

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
