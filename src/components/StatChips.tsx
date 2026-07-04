"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/format";

interface Stats {
  events24h: number;
  kevCount: number;
  trackedCves: number;
}

export default function StatChips() {
  const { data } = useSWR<Stats>("/api/stats", fetcher, {
    refreshInterval: 60_000,
    keepPreviousData: true,
  });
  if (!data) return null;

  const chips: [string, number][] = [
    ["Events 24h", data.events24h],
    ["KEV entries", data.kevCount],
    ["Tracked CVEs", data.trackedCves],
  ];

  return (
    <div className="ml-auto flex items-center gap-2">
      {chips.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 backdrop-blur-xl"
        >
          <span className="font-mono text-sm font-semibold text-slate-100">
            {value.toLocaleString()}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
