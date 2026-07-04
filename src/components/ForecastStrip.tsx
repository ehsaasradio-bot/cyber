"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/format";
import { focusGlobe } from "@/lib/globeBus";
import { REGION_CENTROIDS } from "@/lib/regions";

interface IndexEntry {
  key: string;
  label: string;
  score: number;
  outlook: "Improving" | "Stable" | "Deteriorating";
  level: "Low" | "Guarded" | "Elevated" | "Severe";
  delta: number | null;
  topCountry?: string | null;
}

interface CyberIndex {
  global: IndexEntry;
  regions: IndexEntry[];
}

const LEVEL_STYLE: Record<string, string> = {
  Low: "text-sev-low border-sev-low/30",
  Guarded: "text-sev-medium border-sev-medium/30",
  Elevated: "text-sev-high border-sev-high/40",
  Severe: "text-sev-critical border-sev-critical/40",
};

function Trend({ e }: { e: IndexEntry }) {
  if (e.outlook === "Deteriorating")
    return <span className="text-sev-critical">▲</span>;
  if (e.outlook === "Improving") return <span className="text-sev-low">▼</span>;
  return <span className="text-slate-500">▶</span>;
}

/** The weather bar: global + regional risk pressure with 7-day outlook. */
export default function ForecastStrip() {
  const { data } = useSWR<CyberIndex>("/api/index", fetcher, {
    refreshInterval: 300_000,
    keepPreviousData: true,
  });
  if (!data) return null;

  return (
    <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto px-2 pb-2">
      <div
        className={`flex shrink-0 items-baseline gap-2 rounded-lg border bg-white/[0.05] px-3 py-1.5 backdrop-blur-xl ${LEVEL_STYLE[data.global.level]}`}
        title={`Global cyber pressure: ${data.global.level} · ${data.global.outlook}`}
      >
        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
          CW Index
        </span>
        <span className="font-mono text-lg font-bold leading-none">
          {data.global.score}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider">
          {data.global.level}
        </span>
        <Trend e={data.global} />
      </div>

      {data.regions.map((r) => (
        <button
          key={r.key}
          onClick={() => {
            const c = REGION_CENTROIDS[r.key];
            if (c) focusGlobe({ lat: c.lat, lng: c.lng, severity: "low" });
          }}
          title={`${r.label}: ${r.level} · ${r.outlook}${r.topCountry ? ` · most active: ${r.topCountry}` : ""} — click to view region`}
          className={`flex shrink-0 items-baseline gap-1.5 rounded-lg border bg-white/[0.03] px-2.5 py-1.5 backdrop-blur-xl transition-colors hover:bg-white/[0.08] ${LEVEL_STYLE[r.level]}`}
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
            {r.key}
          </span>
          <span className="font-mono text-sm font-semibold leading-none">{r.score}</span>
          <Trend e={r} />
          {r.delta != null && r.delta !== 0 && (
            <span className="font-mono text-[9px] text-slate-500">
              {r.delta > 0 ? `+${r.delta}` : r.delta}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
