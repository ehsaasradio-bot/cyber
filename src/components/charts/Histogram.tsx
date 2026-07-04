"use client";

import { useState } from "react";

const W = 600;
const H = 176;
const LABEL_H = 14;
const TOP_PAD = 8;
const PLOT_H = H - LABEL_H - TOP_PAD;

export default function Histogram({
  buckets,
  color = "#e879f9",
}: {
  buckets: { label: string; count: number }[];
  color?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(0, ...buckets.map((b) => b.count));
  if (buckets.length === 0 || max <= 0) {
    return (
      <div className="flex h-24 w-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600">
        no data
      </div>
    );
  }

  const n = buckets.length;
  const slot = W / n;
  const barW = Math.max(2, slot * 0.62);

  return (
    <div className="relative w-full select-none" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
        {/* baseline */}
        <line
          x1={0}
          y1={TOP_PAD + PLOT_H}
          x2={W}
          y2={TOP_PAD + PLOT_H}
          stroke="rgba(255,255,255,0.08)"
        />
        {buckets.map((b, i) => {
          const cx = slot * i + slot / 2;
          const h = (b.count / max) * PLOT_H; // linear scale
          const y = TOP_PAD + PLOT_H - h;
          const isHover = hover === i;
          return (
            <g key={`${b.label}-${i}`}>
              {b.count > 0 && (
                <rect
                  className="animate-bar-grow"
                  x={cx - barW / 2}
                  y={y}
                  width={barW}
                  height={h}
                  rx={Math.min(2, barW / 2)}
                  fill={color}
                  opacity={isHover ? 1 : 0.75}
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "bottom",
                    animationDelay: `${i * 22}ms`,
                    filter: isHover
                      ? `drop-shadow(0 0 6px color-mix(in srgb, ${color} 70%, transparent))`
                      : `drop-shadow(0 0 3px color-mix(in srgb, ${color} 30%, transparent))`,
                  }}
                />
              )}
              {/* invisible full-column hit area for easy hovering */}
              <rect
                x={slot * i}
                y={0}
                width={slot}
                height={TOP_PAD + PLOT_H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
              {i % 2 === 0 && (
                <text
                  x={cx}
                  y={H - 3}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize={8}
                  fill={isHover ? "#94a3b8" : "#64748b"}
                >
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* tooltip */}
      {hover !== null && buckets[hover] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded border border-white/10 bg-void/95 px-2 py-1 font-mono text-[10px] text-slate-300 shadow-xl"
          style={{
            left: `${Math.max(8, Math.min(92, ((slot * hover + slot / 2) / W) * 100))}%`,
            top: `${((TOP_PAD + PLOT_H - (buckets[hover].count / max) * PLOT_H) / H) * 100}%`,
          }}
        >
          <span className="text-slate-500">{buckets[hover].label} · </span>
          <span style={{ color }}>{buckets[hover].count.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
