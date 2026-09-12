import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Space_Grotesk, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* Space Grotesk for the figures, Instrument Sans for the prose, JetBrains
   Mono for the clock times. None of the three appears on days 6 to 9 — four
   sites in a row sharing a typeface reads as one site shipped four times. */
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display-loaded",
  display: "swap",
});
const body = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body-loaded",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-loaded",
  display: "swap",
});

const SITE = "https://timezonetax.onedaybuilt.com";
const TITLE = "Timezone tax";
const DESC =
  "Two places, two working days. How many hours you actually share, what the gap takes out of a year, and the twenty weekdays when the clocks hand an hour back.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s · Timezone tax" },
  description: DESC,
  openGraph: {
    title: TITLE,
    description: DESC,
    url: SITE,
    siteName: TITLE,
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
