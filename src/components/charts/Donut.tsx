"use client";

import { useState } from "react";

const PALETTE = [
  "#22d3ee",
  "#e879f9",
  "#f43f5e",
  "#fb923c",
  "#facc15",
  "#38bdf8",
  "#a78bfa",
  "#34d399",
];

const R = 48;
const STROKE = 13;
const C = 2 * Math.PI * R;
const GAP = 2; // px gap between slices along the circumference

export default function Donut({
  slices,
}: {
  slices: { label: string; value: number; color?: string }[];
}) {
  const [hover, setHover] = useState<number | null>(null);

  const total = slices.reduce((s, d) => s + Math.max(0, d.value), 0);
  if (slices.length === 0 || total <= 0) {
    return (
      <div className="flex h-24 w-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600">
        no data
      </div>
    );
  }

  const withColor = slices.map((s, i) => ({
    ...s,
    color: s.color ?? PALETTE[i % PALETTE.length],
  }));

  let acc = 0;
  const arcs = withColor.map((s, i) => {
    const len = (Math.max(0, s.value) / total) * C;
    const dash = len > GAP * 2 ? len - GAP : Math.max(len, 0.001);
    const arc = { ...s, i, dash, offset: -acc };
    acc += len;
    return arc;
  });

  return (
    <div className="flex w-full items-center gap-5">
      <svg viewBox="0 0 120 120" className="size-28 shrink-0">
        {/* track */}
        <circle
          cx={60}
          cy={60}
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={STROKE}
        />
        <g transform="rotate(-90 60 60)">
          {arcs.map((a) =>
            a.value > 0 ? (
              <circle
                key={a.i}
                cx={60}
                cy={60}
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={hover === a.i ? STROKE + 2 : STROKE}
                strokeDasharray={`${a.dash} ${C - a.dash}`}
                strokeDashoffset={a.offset}
                opacity={hover === null || hover === a.i ? 1 : 0.3}
                className="transition-all duration-200"
                style={
                  hover === a.i
                    ? { filter: `drop-shadow(0 0 5px color-mix(in srgb, ${a.color} 70%, transparent))` }
                    : undefined
                }
                onMouseEnter={() => setHover(a.i)}
                onMouseLeave={() => setHover(null)}
              />
            ) : null,
          )}
        </g>
        <text
          x={60}
          y={60}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={21}
          fill="#e2e8f0"
        >
          {(hover !== null ? withColor[hover].value : total).toLocaleString()}
        </text>
        <text
          x={60}
          y={75}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={7}
          letterSpacing={2.5}
          fill="#64748b"
        >
          {hover !== null ? "OF" : "TOTAL"}
        </text>
      </svg>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {withColor.map((s, i) => (
          <li
            key={`${s.label}-${i}`}
            className="flex cursor-default items-center gap-2 font-mono text-[11px] transition-opacity"
            style={{ opacity: hover === null || hover === i ? 1 : 0.4 }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{
                backgroundColor: s.color,
                boxShadow: `0 0 5px color-mix(in srgb, ${s.color} 60%, transparent)`,
              }}
            />
            <span className="min-w-0 flex-1 truncate text-slate-300" title={s.label}>
              {s.label}
            </span>
            <span className="shrink-0 tabular-nums text-slate-500">
              {s.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
