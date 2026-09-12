import type { MetadataRoute } from "next";
import { EXAMPLES } from "@/lib/examples";
import { slugOf } from "@/lib/zones";

const SITE = "https://timezonetax.onedaybuilt.com";

/* Only the pairs that are built ahead of time. The other 173,000 combinations
   are real pages, but a sitemap that lists every one of them is a sitemap
   nobody reads and a crawl budget spent on nothing. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, changeFrequency: "monthly", priority: 1 },
    ...EXAMPLES.map(([you, them]) => ({
      url: `${SITE}/p/${slugOf(you)}--${slugOf(them)}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
