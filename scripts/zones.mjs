/* Regenerates src/lib/zones.data.ts from the runtime's own ICU data.
 *
 * Run it when the bundled tzdata moves on:  node scripts/zones.mjs
 * It writes the file this site reads; it does not print and exit. */
import { writeFileSync } from "node:fs";

const zones = Intl.supportedValuesOf("timeZone");
const display = new Intl.DisplayNames(["en"], { type: "region" });
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/* There is no zone-to-country API, only country-to-zones. Ask every possible
   ISO region code for its timezones and reverse the answer. */
const countryOf = {};
const names = {};
for (const a of LETTERS)
  for (const b of LETTERS) {
    const code = a + b;
    let list;
    try {
      list = new Intl.Locale(`und-${code}`).getTimeZones();
    } catch {
      continue;
    }
    if (!list?.length) continue;
    for (const zone of list)
      if (!countryOf[zone]) {
        countryOf[zone] = code;
        names[code] = display.of(code) ?? code;
      }
  }

const missing = zones.filter((z) => !countryOf[z]);
if (missing.length) throw new Error(`no country for: ${missing.join(", ")}`);

const header = `/* Generated from the runtime's own ICU data on Node ${process.version}, ${new Date()
  .toISOString()
  .slice(0, 10)}.
 *
 * ZONES is Intl.supportedValuesOf("timeZone"). It is frozen into the bundle on
 * purpose: Node and the browsers disagree about which alias is canonical —
 * Chrome says America/Argentina/Buenos_Aires, Node says America/Buenos_Aires —
 * and a list built from the live runtime would differ between the server and
 * the browser, which React treats as a hydration error.
 *
 * COUNTRY is the zone-to-country map, built by asking every ISO region code
 * for its timezones (new Intl.Locale("und-FR").getTimeZones()) and reversing
 * the answer. All ${zones.length} zones are covered. The names come from
 * Intl.DisplayNames, so nothing here was typed by hand and no country list has
 * to be maintained.
 *
 * Regenerate with: node scripts/zones.mjs
 */
`;

const body =
  `export const ZONES: readonly string[] = [\n${zones.map((z) => `  "${z}",`).join("\n")}\n];\n\n` +
  `export const COUNTRY: Readonly<Record<string, string>> = {\n${zones
    .map((z) => `  "${z}": "${countryOf[z]}",`)
    .join("\n")}\n};\n\n` +
  `export const COUNTRY_NAME: Readonly<Record<string, string>> = {\n${Object.keys(names)
    .sort()
    .map((c) => `  ${c}: ${JSON.stringify(names[c])},`)
    .join("\n")}\n};\n`;

writeFileSync(new URL("../src/lib/zones.data.ts", import.meta.url), header + body);
console.log(`wrote src/lib/zones.data.ts — ${zones.length} zones, ${Object.keys(names).length} countries`);
