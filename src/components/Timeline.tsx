"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/format";

interface Bucket {
  ts: string;
  total: number;
  bySeverity: { critical: number; high: number; medium: number; low: number };
}

const SEV_COLORS: [keyof Bucket["bySeverity"], string][] = [
  ["low", "var(--color-sev-low)"],
  ["medium", "var(--color-sev-medium)"],
  ["high", "var(--color-sev-high)"],
  ["critical", "var(--color-sev-critical)"],
];

export default function Timeline({ window: win }: { window: "24h" | "7d" }) {
  const { data, isLoading } = useSWR<{ buckets: Bucket[] }>(
    `/api/timeline?window=${win}`,
    fetcher,
    { refreshInterval: 60_000, keepPreviousData: true },
  );
  const [hover, setHover] = useState<number | null>(null);

  if (isLoading && !data) {
    return (
      <div className="flex h-full items-end gap-1 p-3">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-white/[0.05]"
            style={{ height: `${20 + ((i * 37) % 60)}%` }}
          />
        ))}
      </div>
    );
  }

  const buckets = data?.buckets ?? [];
  const max = Math.max(1, ...buckets.map((b) => b.total));

  return (
    <div className="relative flex h-full items-end gap-1 px-3 pb-5 pt-2">
      {buckets.map((b, i) => {
        const label = new Date(b.ts).toLocaleString(undefined, {
          ...(win === "7d" ? { weekday: "short" } : {}),
          hour: "2-digit",
          minute: win === "7d" ? undefined : "2-digit",
        });
        return (
          <div
            key={b.ts}
            className="group relative flex h-full flex-1 flex-col justify-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div
              className="flex w-full origin-bottom animate-bar-grow flex-col-reverse overflow-hidden rounded-t-sm opacity-80 transition-opacity group-hover:opacity-100"
              style={{
                height: `${(b.total / max) * 100}%`,
                animationDelay: `${i * 25}ms`,
              }}
            >
              {SEV_COLORS.map(([sev, color]) =>
                b.bySeverity[sev] > 0 ? (
                  <div
                    key={sev}
                    style={{
                      backgroundColor: color,
                      height: `${(b.bySeverity[sev] / Math.max(b.total, 1)) * 100}%`,
                    }}
                  />
                ) : null,
              )}
            </div>
            {hover === i && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-void/95 px-2.5 py-1.5 font-mono text-[10px] text-slate-300 shadow-xl">
                <span className="text-slate-500">{label} · </span>
                {b.total} events
                {b.bySeverity.critical > 0 && (
                  <span className="text-sev-critical"> · {b.bySeverity.critical} crit</span>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className="absolute bottom-1 left-3 font-mono text-[9px] uppercase tracking-wider text-slate-600">
        {buckets[0] &&
          new Date(buckets[0].ts).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
          })}
      </div>
      <div className="absolute bottom-1 right-3 font-mono text-[9px] uppercase tracking-wider text-slate-600">
        now
      </div>
    </div>
  );
}
