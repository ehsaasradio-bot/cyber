"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/format";

interface Briefing {
  briefing: string;
  source: "ai" | "auto";
  generatedAt: string;
}

/** Collapsible daily weather report under the header. */
export default function BriefingBanner() {
  const { data } = useSWR<Briefing>("/api/briefing", fetcher, {
    refreshInterval: 6 * 60 * 60 * 1000,
    keepPreviousData: true,
  });
  const [open, setOpen] = useState(false);
  if (!data) return null;

  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className="pointer-events-auto mx-2 mb-2 flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-left backdrop-blur-xl transition-colors hover:bg-white/[0.06]"
      title={open ? "Collapse" : "Expand briefing"}
    >
      <span className="mt-px shrink-0 font-mono text-[9px] font-semibold uppercase tracking-widest text-pulse">
        Weather report
      </span>
      <span
        className={`min-w-0 flex-1 font-mono text-[11px] leading-relaxed text-slate-300 ${
          open ? "" : "truncate"
        }`}
      >
        {data.briefing}
      </span>
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-slate-600">
        {data.source === "ai" ? "AI" : "Auto"} {open ? "▲" : "▼"}
      </span>
    </button>
  );
}
