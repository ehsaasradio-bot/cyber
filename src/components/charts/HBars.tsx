"use client";

import { useEffect, useState } from "react";

export default function HBars({
  data,
  color = "#22d3ee",
  formatValue,
}: {
  data: { label: string; value: number; accent?: number }[];
  color?: string;
  formatValue?: (v: number) => string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const max = Math.max(0, ...data.map((d) => d.value));
  if (data.length === 0 || max <= 0) {
    return (
      <div className="flex h-24 w-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600">
        no data
      </div>
    );
  }

  const fmt = formatValue ?? ((v: number) => v.toLocaleString());

  return (
    <div className="flex w-full flex-col gap-2.5">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const accentPct =
          d.accent !== undefined
            ? (Math.min(d.accent, d.value) / max) * 100
            : null;
        return (
          <div key={`${d.label}-${i}`} className="group flex items-center gap-2.5">
            <span
              className="w-[32%] min-w-0 shrink-0 truncate font-mono text-[11px] text-slate-400 transition-colors group-hover:text-slate-200"
              title={d.label}
            >
              {d.label}
            </span>
            <div className="relative h-2 min-w-0 flex-1 rounded-full bg-white/[0.04]">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: mounted ? `${pct}%` : "0%",
                  transitionDelay: `${i * 45}ms`,
                  background: `linear-gradient(90deg, color-mix(in srgb, ${color} 45%, transparent), ${color})`,
                  boxShadow: `0 0 10px -1px color-mix(in srgb, ${color} 60%, transparent)`,
                }}
              />
              {accentPct !== null && accentPct > 0 && (
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: mounted ? `${accentPct}%` : "0%",
                    transitionDelay: `${i * 45 + 120}ms`,
                    backgroundColor: "#f43f5e",
                    boxShadow: "0 0 8px -1px rgba(244,63,94,0.7)",
                  }}
                />
              )}
            </div>
            <span className="w-14 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-300">
              {fmt(d.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
