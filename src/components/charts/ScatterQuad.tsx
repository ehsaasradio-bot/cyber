"use client";

import { useState } from "react";

const W = 600;
const H = 320;
const M = { top: 12, right: 12, bottom: 32, left: 34 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const MAX_POINTS = 400;

const MONO = "var(--font-mono)";

type Pt = { x: number; y: number; id: string; highlight?: boolean };

export default function ScatterQuad({
  points,
  xLabel,
  yLabel,
  onPointClick,
}: {
  points: { x: number; y: number; id: string; highlight?: boolean }[];
  xLabel: string;
  yLabel: string;
  onPointClick?: (id: string) => void;
}) {
  const [hover, setHover] = useState<Pt | null>(null);

  if (points.length === 0) {
    return (
      <div className="flex h-40 w-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600">
        no data
      </div>
    );
  }

  // Cap DOM work; keep highlighted points first so they always render.
  let shown = points;
  if (points.length > MAX_POINTS) {
    const hi = points.filter((p) => p.highlight);
    const rest = points.filter((p) => !p.highlight);
    shown = [...hi, ...rest].slice(0, MAX_POINTS);
  }

  const px = (x: number) => M.left + Math.max(0, Math.min(1, x)) * PLOT_W;
  const py = (y: number) => M.top + (1 - Math.max(0, Math.min(10, y)) / 10) * PLOT_H;

  const qx = px(0.5);
  const qy = py(7);

  return (
    <div className="relative w-full select-none">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
        {/* plot frame */}
        <rect
          x={M.left}
          y={M.top}
          width={PLOT_W}
          height={PLOT_H}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
        />
        {/* quadrant reference lines */}
        <line x1={qx} y1={M.top} x2={qx} y2={M.top + PLOT_H} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
        <line x1={M.left} y1={qy} x2={M.left + PLOT_W} y2={qy} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />

        {/* quadrant captions */}
        <g fontFamily={MONO} fontSize={8} fill="#475569" letterSpacing={1.5}>
          <text x={M.left + 8} y={M.top + 14}>WATCH</text>
          <text x={M.left + PLOT_W - 8} y={M.top + 14} textAnchor="end">PATCH NOW</text>
          <text x={M.left + 8} y={M.top + PLOT_H - 8}>MONITOR</text>
          <text x={M.left + PLOT_W - 8} y={M.top + PLOT_H - 8} textAnchor="end">PLAN</text>
        </g>

        {/* tick labels */}
        <g fontFamily={MONO} fontSize={8} fill="#475569">
          <text x={px(0)} y={M.top + PLOT_H + 11} textAnchor="middle">0</text>
          <text x={qx} y={M.top + PLOT_H + 11} textAnchor="middle">0.5</text>
          <text x={px(1)} y={M.top + PLOT_H + 11} textAnchor="middle">1.0</text>
          <text x={M.left - 5} y={py(0) + 3} textAnchor="end">0</text>
          <text x={M.left - 5} y={qy + 3} textAnchor="end">7</text>
          <text x={M.left - 5} y={py(10) + 3} textAnchor="end">10</text>
        </g>

        {/* axis labels */}
        <g fontFamily={MONO} fontSize={9} fill="#64748b" letterSpacing={1.5}>
          <text x={M.left + PLOT_W / 2} y={H - 6} textAnchor="middle">
            {xLabel.toUpperCase()}
          </text>
          <text
            x={10}
            y={M.top + PLOT_H / 2}
            textAnchor="middle"
            transform={`rotate(-90 10 ${M.top + PLOT_H / 2})`}
          >
            {yLabel.toUpperCase()}
          </text>
        </g>

        {/* points */}
        {shown.map((p, i) => {
          const isHover = hover?.id === p.id;
          return (
            <circle
              key={`${p.id}-${i}`}
              cx={px(p.x)}
              cy={py(p.y)}
              r={isHover ? 4.5 : 3}
              fill={p.highlight ? "#f43f5e" : "#38bdf8"}
              opacity={p.highlight || isHover ? 1 : 0.55}
              className={onPointClick ? "cursor-pointer" : undefined}
              style={
                p.highlight
                  ? { filter: "drop-shadow(0 0 4px rgba(244,63,94,0.8))" }
                  : isHover
                    ? { filter: "drop-shadow(0 0 4px rgba(56,189,248,0.8))" }
                    : undefined
              }
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onPointClick?.(p.id)}
            />
          );
        })}
      </svg>

      {/* tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded border border-white/10 bg-void/95 px-2 py-1 font-mono text-[10px] text-slate-300 shadow-xl"
          style={{
            left: `${Math.max(10, Math.min(90, (px(hover.x) / W) * 100))}%`,
            top: `${(py(hover.y) / H) * 100}%`,
          }}
        >
          <span className={hover.highlight ? "text-sev-critical" : "text-sev-low"}>
            {hover.id}
          </span>
          <span className="text-slate-500">
            {" "}
            · {hover.x.toFixed(2)} / {hover.y.toFixed(1)}
          </span>
        </div>
      )}
    </div>
  );
}
