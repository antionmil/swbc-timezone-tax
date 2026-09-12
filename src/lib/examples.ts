import { zoneFromSlug } from "./zones";

/* The pairs that get built ahead of time.
 *
 * They are the links on the front page AND the argument to
 * generateStaticParams, from one list, so the page cannot advertise a route
 * that was never prerendered. Any other pair still works: it renders once on
 * demand and is cached from then on. */
const PAIRS: [string, string][] = [
  ["Europe/London", "America/New_York"],
  ["Europe/Paris", "America/Los_Angeles"],
  ["America/New_York", "Asia/Kolkata"],
  ["Europe/Berlin", "Asia/Singapore"],
  ["America/Los_Angeles", "Australia/Sydney"],
  ["Europe/London", "Asia/Tokyo"],
  ["America/New_York", "Europe/Berlin"],
  ["Asia/Kolkata", "Australia/Sydney"],
  ["America/Chicago", "Europe/Lisbon"],
  ["Europe/Amsterdam", "America/Sao_Paulo"],
  ["America/Toronto", "Asia/Manila"],
  ["Europe/Madrid", "America/Mexico_City"],
];

/* Through the alias map, so one spelling reaches the routes, the links and
   the prerender list. */
export const EXAMPLES: [string, string][] = PAIRS.map(([a, b]) => [
  zoneFromSlug(a) ?? a,
  zoneFromSlug(b) ?? b,
]);
