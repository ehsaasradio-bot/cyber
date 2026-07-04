"use client";

import { useId, useRef, useState } from "react";

type Point = { label: string; value: number; value2?: number };

/** Catmull-Rom → cubic bezier smoothing in normalized 0-100 space. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1y = Math.min(100, Math.max(0, p1[1] + (p2[1] - p0[1]) / 6));
    const c2y = Math.min(100, Math.max(0, p2[1] - (p3[1] - p1[1]) / 6));
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function fmt(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(v >= 100_000 ? 0 : 1)}k`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

const X_LABELS_H = 16; // px reserved under the plot for x labels

export default function AreaTrend({
  data,
  color = "#22d3ee",
  color2 = "#f43f5e",
  height = 180,
}: {
  data: { label: string; value: number; value2?: number }[];
  color?: string;
  color2?: string;
  height?: number;
}) {
  const gradId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(0, ...data.map((d) => Math.max(d.value, d.value2 ?? 0)));
  if (data.length === 0 || max <= 0) {
    return (
      <div
        className="flex w-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600"
        style={{ height }}
      >
        no data
      </div>
    );
  }

  const yMax = max * 1.08; // headroom so peaks don't touch the top
  const plotH = height - X_LABELS_H;
  // Single-point series → flat line across the full width.
  const series: Point[] = data.length === 1 ? [data[0], data[0]] : data;
  const n = series.length;

  const xPct = (i: number) => (i / (n - 1)) * 100;
  const yPct = (v: number) => (1 - v / yMax) * 100;

  const pts1: [number, number][] = series.map((d, i) => [xPct(i), yPct(d.value)]);
  const line1 = smoothPath(pts1);
  const area1 = `${line1} L 100,100 L 0,100 Z`;

  const hasSecond = series.some((d) => d.value2 !== undefined);
  const line2 = hasSecond
    ? smoothPath(series.map((d, i) => [xPct(i), yPct(d.value2 ?? 0)]))
    : "";

  const gridFracs = [0.25, 0.5, 0.75, 1];
  const mid = Math.floor((data.length - 1) / 2);
  const hovered = hover !== null ? data[Math.min(hover, data.length - 1)] : null;
  const hoverPct = hover !== null ? xPct(Math.min(hover, n - 1)) : 0;

  const onMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const frac = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1)))));
  };

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ height }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      {/* gridlines + y labels */}
      {gridFracs.map((f) => (
        <div
          key={f}
          className="pointer-events-none absolute inset-x-0 border-t border-white/[0.05]"
          style={{ top: (1 - (f * max) / yMax) * plotH }}
        >
          <span className="absolute -top-1.5 left-0 font-mono text-[9px] leading-none text-slate-600">
            {fmt(f * max)}
          </span>
        </div>
      ))}

      {/* plot */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-0 block w-full"
        style={{ height: plotH }}
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="70%" stopColor={color} stopOpacity="0.06" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area1} fill={`url(#${gradId})`} />
        <path
          d={line1}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 3px color-mix(in srgb, ${color} 55%, transparent))` }}
        />
        {hasSecond && (
          <path
            d={line2}
            fill="none"
            stroke={color2}
            strokeWidth={1.25}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ filter: `drop-shadow(0 0 3px color-mix(in srgb, ${color2} 45%, transparent))` }}
          />
        )}
      </svg>

      {/* x labels: first / middle / last */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 font-mono text-[9px] leading-none text-slate-500"
        style={{ height: X_LABELS_H }}
      >
        <span className="absolute bottom-0 left-0">{data[0].label}</span>
        {data.length > 2 && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2">
            {data[mid].label}
          </span>
        )}
        {data.length > 1 && (
          <span className="absolute bottom-0 right-0">
            {data[data.length - 1].label}
          </span>
        )}
      </div>

      {/* crosshair + markers + tooltip */}
      {hovered && (
        <>
          <div
            className="pointer-events-none absolute top-0 w-px bg-white/20"
            style={{ left: `${hoverPct}%`, height: plotH }}
          />
          <div
            className="pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${hoverPct}%`,
              top: (yPct(hovered.value) / 100) * plotH,
              backgroundColor: color,
              boxShadow: `0 0 6px color-mix(in srgb, ${color} 80%, transparent)`,
            }}
          />
          {hovered.value2 !== undefined && (
            <div
              className="pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${hoverPct}%`,
                top: (yPct(hovered.value2) / 100) * plotH,
                backgroundColor: color2,
                boxShadow: `0 0 6px color-mix(in srgb, ${color2} 80%, transparent)`,
              }}
            />
          )}
          <div
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded border border-white/10 bg-void/95 px-2 py-1 font-mono text-[10px] text-slate-300 shadow-xl"
            style={{ left: `${Math.max(12, Math.min(88, hoverPct))}%` }}
          >
            <span className="text-slate-500">{hovered.label}</span>
            <span style={{ color }}> {fmt(hovered.value)}</span>
            {hovered.value2 !== undefined && (
              <span style={{ color: color2 }}> · {fmt(hovered.value2)}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
