"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/format";
import { onGlobeFocus, selectGlobeEvent, type GlobeFocus } from "@/lib/globeBus";
import { onCriticalPulse } from "@/lib/criticalPulse";
import { REGION_BOUNDS, REGION_LABELS } from "@/lib/regions";
import type { GlobeView } from "./ViewSelect";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#f43f5e",
  high: "#fb923c",
  medium: "#facc15",
  low: "#38bdf8",
};

const WORLD_BOUNDS: [number, number, number, number] = [-180, -58, 180, 80];
const W = 960;
const H = 480;

interface FlatPoint {
  id?: string;
  lat: number;
  lng: number;
  size: number;
  severity: string;
  type: string;
  source: string;
  title: string;
  label: string;
  occurredAt: string;
  country: string | null;
  city: string | null;
  ip: string | null;
  metadata: Record<string, unknown> | null;
}

interface GlobePayload {
  points: FlatPoint[];
  countryCounts: Record<string, number>;
  generatedAt: string;
}

interface CountryFeature {
  properties: { ADMIN: string; ISO_A2: string; ISO_A2_EH?: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
}

function countryIso(f: CountryFeature): string {
  const iso = f.properties.ISO_A2;
  return iso && iso !== "-99" ? iso : (f.properties.ISO_A2_EH ?? "");
}

function heatColor(count: number, max: number): string {
  if (!count) return "rgba(34,211,238,0.03)";
  const t = Math.log1p(count) / Math.log1p(Math.max(max, 2));
  return `rgba(244,63,94,${(0.08 + t * 0.55).toFixed(3)})`;
}

function project(lon: number, lat: number, b: [number, number, number, number]): [number, number] {
  const [minLon, minLat, maxLon, maxLat] = b;
  const x = ((lon - minLon) / (maxLon - minLon)) * W;
  const y = ((maxLat - lat) / (maxLat - minLat)) * H;
  return [x, y];
}

export default function FlatMap({
  window: win,
  view,
  industry,
  overridePoints,
}: {
  window: "24h" | "7d";
  view: GlobeView;
  industry?: string | null;
  overridePoints?: FlatPoint[] | null;
}) {
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [region, setRegion] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
  const [flash, setFlash] = useState<{ x: number; y: number } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [blasts, setBlasts] = useState<{ x: number; y: number; key: number }[]>([]);

  const bounds = region ? REGION_BOUNDS[region] : WORLD_BOUNDS;
  // Effects below subscribe once ([] deps) but must always project against the
  // CURRENT bounds (continent zoom can change after mount) — a ref sidesteps
  // stale closures without resubscribing on every zoom change.
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  const { data } = useSWR<GlobePayload>(
    `/api/globe?window=${win}&view=${view}${industry ? `&industry=${industry}` : ""}`,
    fetcher,
    { refreshInterval: 60_000, keepPreviousData: true },
  );

  useEffect(() => {
    fetch("/countries.geojson")
      .then((r) => r.json())
      .then((geo) => setCountries(geo.features ?? []))
      .catch(() => {});
  }, []);

  useEffect(
    () =>
      onGlobeFocus((f: GlobeFocus) => {
        const [x, y] = project(f.lng, f.lat, boundsRef.current);
        setFlash({ x, y });
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 2_200);
      }),
    [],
  );

  useEffect(
    () =>
      onCriticalPulse((e) => {
        const [x, y] = project(e.lng, e.lat, boundsRef.current);
        const key = Date.now();
        setBlasts((prev) => [...prev, { x, y, key }]);
        setTimeout(() => setBlasts((prev) => prev.filter((b) => b.key !== key)), 2_400);
      }),
    [],
  );

  const paths = useMemo(() => {
    return countries.map((f) => {
      const rings =
        f.geometry.type === "Polygon"
          ? (f.geometry.coordinates as number[][][])
          : (f.geometry.coordinates as number[][][][]).flat();
      const d = rings
        .map((ring) => {
          const pts = ring.map(([lon, lat]) => project(lon, lat, bounds));
          return `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L")}Z`;
        })
        .join(" ");
      return { iso: countryIso(f), name: f.properties.ADMIN, d };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, bounds]);

  const points = overridePoints ?? data?.points ?? [];
  const counts = data?.countryCounts ?? {};
  const maxCount = Math.max(1, ...Object.values(counts));

  const onPointClick = (p: FlatPoint) => {
    selectGlobeEvent({
      title: p.title,
      severity: p.severity,
      type: p.type,
      source: p.source,
      ip: p.ip,
      country: p.country,
      city: p.city,
      occurredAt: p.occurredAt,
      metadata: p.metadata,
    });
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="pointer-events-auto flex flex-wrap gap-1.5 px-2 pt-1">
        <button
          onClick={() => setRegion(null)}
          className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
            !region
              ? "border-neon/40 bg-neon/10 text-neon"
              : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
          }`}
        >
          World
        </button>
        {Object.entries(REGION_LABELS).map(([code, label]) => (
          <button
            key={code}
            onClick={() => setRegion(code)}
            className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              region === code
                ? "border-neon/40 bg-neon/10 text-neon"
                : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative min-h-0 flex-1 p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="flatmap-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x={0} y={0} width={W} height={H} fill="url(#flatmap-glow)" />

          {paths.map((c) => (
            <path
              key={c.iso || c.name}
              d={c.d}
              fill={view === "heat" ? heatColor(counts[c.iso] ?? 0, maxCount) : "rgba(34,211,238,0.03)"}
              stroke="rgba(34,211,238,0.3)"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
              onMouseEnter={(e) => {
                if (view !== "heat") return;
                const n = counts[c.iso] ?? 0;
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setHover({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  label: `${c.name} — ${n} event${n === 1 ? "" : "s"}`,
                });
              }}
              onMouseLeave={() => setHover(null)}
              className="cursor-default transition-colors hover:fill-neon/10"
            />
          ))}

          {points.map((p, i) => {
            const [x, y] = project(p.lng, p.lat, bounds);
            if (x < -5 || x > W + 5 || y < -5 || y > H + 5) return null;
            const r = 1.4 + p.size * 2.2;
            return (
              <circle
                key={p.id ?? i}
                cx={x}
                cy={y}
                r={r}
                fill={SEVERITY_COLOR[p.severity] ?? "#38bdf8"}
                fillOpacity={0.85}
                className="cursor-pointer transition-[r] hover:opacity-100"
                onClick={() => onPointClick(p)}
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, label: p.label });
                }}
                onMouseLeave={() => setHover(null)}
              >
                <title>{p.label}</title>
              </circle>
            );
          })}

          {flash && (
            <circle
              cx={flash.x}
              cy={flash.y}
              r={2}
              fill="none"
              stroke="#f43f5e"
              strokeWidth={2}
              opacity={0.9}
            >
              <animate attributeName="r" from="2" to="26" dur="2s" fill="freeze" />
              <animate attributeName="opacity" from="0.9" to="0" dur="2s" fill="freeze" />
            </circle>
          )}

          {blasts.map((b) => (
            <circle
              key={b.key}
              cx={b.x}
              cy={b.y}
              r={2}
              fill="none"
              stroke="#f43f5e"
              strokeWidth={2.5}
              opacity={1}
            >
              <animate attributeName="r" from="2" to="60" dur="2.2s" repeatCount="1" fill="freeze" />
              <animate attributeName="opacity" from="1" to="0" dur="2.2s" repeatCount="1" fill="freeze" />
            </circle>
          ))}
        </svg>

        {hover && (
          <div
            className="scene-tooltip pointer-events-none absolute z-20"
            style={{ left: hover.x + 12, top: hover.y - 8 }}
          >
            {hover.label}
          </div>
        )}
      </div>
    </div>
  );
}
