"use client";

import { useEffect, useState } from "react";

export function Share({ path }: { path: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 2400);
    return () => clearTimeout(t);
  }, [state]);

  const copy = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      /* A clipboard write can be refused — an insecure context, a browser
         setting, a permission the visitor never granted. Say so and show the
         link instead of pretending it worked. */
      setState("failed");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={copy}
        className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
      >
        {state === "copied" ? "Link copied" : "Copy this pair as a link"}
      </button>
      <span className="font-mono text-xs break-all text-muted">
        {state === "failed" ? "Copy failed — the address bar has it" : path}
      </span>
    </div>
  );
}
