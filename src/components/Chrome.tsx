import Link from "next/link";

export function Masthead() {
  return (
    <header className="flex items-baseline justify-between gap-4">
      <Link href="/" className="font-mono text-[11px] tracking-[0.22em] text-accent uppercase">
        Timezone tax
      </Link>
      <span className="text-[11px] text-muted">day 10 of 26 · onedaybuilt</span>
    </header>
  );
}

export function Colophon() {
  return (
    <footer className="flex flex-col gap-3 border-t border-rule pt-7 text-[13px] leading-relaxed text-muted">
      <p className="max-w-[62ch]">
        Every figure here is worked out from the IANA timezone database, the same one your
        operating system uses, and it is worked out in your browser. Nothing you choose is sent
        anywhere, stored, or counted. There is no account and there is nothing to buy.
      </p>
      <p className="max-w-[62ch]">
        Hours are a working day, not a life: the tax is measured against the day you keep, so
        change the working day and every number on the page changes with it. Public holidays are
        not counted, and neither is anybody&rsquo;s willingness to take a call at 22:00.
      </p>
      <p>
        <a href="https://onedaybuilt.com" className="text-accent hover:underline">
          onedaybuilt.com
        </a>{" "}
        — one website a day, every day of September.
      </p>
    </footer>
  );
}
