"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/format";
import { onGlobeFocus, selectGlobeEvent, type GlobeFocus } from "@/lib/globeBus";
import { onCriticalPulse } from "@/lib/criticalPulse";
import { REGION_BOUNDS } from "@/lib/regions";
import type { GlobeView } from "./ViewSelect";
import FlatControls from "./FlatControls";

export interface FlatMapHandle {
  jumpTo: (code: string | null) => void;
  zoomBy: (factor: number) => void;
  toggleFullscreen: () => void;
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#f43f5e",
  high: "#fb923c",
  medium: "#facc15",
  low: "#38bdf8",
};

const WORLD_BOUNDS: [number, number, number, number] = [-180, -58, 180, 80];
const W = 960;
const H = 480;
const MIN_W = W / 14; // deepest zoom (~14x)
const ASPECT = H / W;

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}
const WORLD_VB: ViewBox = { x: 0, y: 0, w: W, h: H };

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

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Fixed equirectangular projection to the 0..W × 0..H world canvas. Pan/zoom is
 * handled entirely by the SVG viewBox, so geometry never re-projects. */
function project(lon: number, lat: number): [number, number] {
  const [minLon, minLat, maxLon, maxLat] = WORLD_BOUNDS;
  const x = ((lon - minLon) / (maxLon - minLon)) * W;
  const y = ((maxLat - lat) / (maxLat - minLat)) * H;
  return [x, y];
}

/** Keep a viewBox inside the world and locked to the world's 2:1 aspect. */
function clampVb(vb: ViewBox): ViewBox {
  const w = clamp(vb.w, MIN_W, W);
  const h = w * ASPECT;
  return {
    w,
    h,
    x: clamp(vb.x, 0, W - w),
    y: clamp(vb.y, 0, H - h),
  };
}

interface FlatMapProps {
  window: "24h" | "7d";
  view: GlobeView;
  industry?: string | null;
  overridePoints?: FlatPoint[] | null;
  /** Notifies the parent so it can render the control bar in the overlay flow. */
  onControlState?: (s: { preset: string | null; expanded: boolean }) => void;
}

const FlatMap = forwardRef<FlatMapHandle, FlatMapProps>(function FlatMap(
  { window: win, view, industry, overridePoints, onControlState },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [vb, setVb] = useState<ViewBox>(WORLD_VB);
  const [preset, setPreset] = useState<string | null>("world");
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [flash, setFlash] = useState<{ x: number; y: number; scale: number } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [blasts, setBlasts] = useState<{ x: number; y: number; key: number; scale: number }[]>([]);

  // Effects subscribe once but read the live viewBox scale via a ref.
  const vbRef = useRef(vb);
  vbRef.current = vb;
  const drag = useRef<{ px: number; py: number; startVb: ViewBox; moved: boolean } | null>(null);

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

  // Escape exits full-screen map mode.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  useEffect(
    () =>
      onGlobeFocus((f: GlobeFocus) => {
        const [x, y] = project(f.lng, f.lat);
        setFlash({ x, y, scale: vbRef.current.w / W });
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 2_200);
      }),
    [],
  );

  useEffect(
    () =>
      onCriticalPulse((e) => {
        const [x, y] = project(e.lng, e.lat);
        const key = Date.now();
        setBlasts((prev) => [...prev, { x, y, key, scale: vbRef.current.w / W }]);
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
          const pts = ring.map(([lon, lat]) => project(lon, lat));
          return `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L")}Z`;
        })
        .join(" ");
      return { iso: countryIso(f), name: f.properties.ADMIN, d };
    });
  }, [countries]);

  const points = overridePoints ?? data?.points ?? [];
  const counts = data?.countryCounts ?? {};
  const maxCount = Math.max(1, ...Object.values(counts));
  const zoomScale = vb.w / W; // <1 when zoomed in — keeps markers screen-constant

  /* ----------------------------- navigation ----------------------------- */

  // Convert a screen point to world coords, honoring xMidYMid meet letterboxing.
  function screenToWorld(clientX: number, clientY: number): [number, number] {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / vb.w, rect.height / vb.h);
    const offX = (rect.width - vb.w * scale) / 2;
    const offY = (rect.height - vb.h * scale) / 2;
    const wx = vb.x + (clientX - rect.left - offX) / scale;
    const wy = vb.y + (clientY - rect.top - offY) / scale;
    return [wx, wy];
  }

  // Wheel zoom centered on the cursor. Native listener so we can preventDefault.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cur = vbRef.current;
      const rect = svg.getBoundingClientRect();
      const scale = Math.min(rect.width / cur.w, rect.height / cur.h);
      const offX = (rect.width - cur.w * scale) / 2;
      const offY = (rect.height - cur.h * scale) / 2;
      const wx = cur.x + (e.clientX - rect.left - offX) / scale;
      const wy = cur.y + (e.clientY - rect.top - offY) / scale;
      const fx = (wx - cur.x) / cur.w;
      const fy = (wy - cur.y) / cur.h;
      const factor = e.deltaY > 0 ? 1.18 : 1 / 1.18;
      const newW = clamp(cur.w * factor, MIN_W, W);
      const newH = newW * ASPECT;
      setPreset(null);
      setVb(clampVb({ w: newW, h: newH, x: wx - fx * newW, y: wy - fy * newH }));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [vb.w, vb.h, vb.x, vb.y]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, startVb: vb, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const scale = Math.min(rect.width / d.startVb.w, rect.height / d.startVb.h);
    const dx = (e.clientX - d.px) / scale;
    const dy = (e.clientY - d.py) / scale;
    if (Math.abs(e.clientX - d.px) + Math.abs(e.clientY - d.py) > 3) d.moved = true;
    setPreset(null);
    setVb(clampVb({ ...d.startVb, x: d.startVb.x - dx, y: d.startVb.y - dy }));
  };
  const endDrag = (e: React.PointerEvent) => {
    (e.currentTarget as SVGSVGElement).releasePointerCapture?.(e.pointerId);
    drag.current = null;
  };

  const zoomBy = (factor: number) => {
    setPreset(null);
    // Functional updater so rapid clicks compound instead of reading a stale vb.
    setVb((prev) => {
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      const newW = clamp(prev.w * factor, MIN_W, W);
      const newH = newW * ASPECT;
      return clampVb({ w: newW, h: newH, x: cx - newW / 2, y: cy - newH / 2 });
    });
  };

  const jumpTo = (code: string | null) => {
    setPreset(code ?? "world");
    if (!code) return setVb(WORLD_VB);
    const [minLon, minLat, maxLon, maxLat] = REGION_BOUNDS[code];
    const [x0, y0] = project(minLon, maxLat); // top-left
    const [x1, y1] = project(maxLon, minLat); // bottom-right
    let w = x1 - x0;
    const h = y1 - y0;
    // fit the region into the locked 2:1 aspect (expand the shorter axis, centered)
    if (w / h < 1 / ASPECT) w = h / ASPECT;
    setVb(clampVb({ w, h: w * ASPECT, x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - (w * ASPECT) / 2 }));
  };

  const onPointClick = (p: FlatPoint) => {
    if (drag.current?.moved) return; // was a pan, not a click
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

  // Expose actions so the parent can drive the controls from the overlay flow
  // (keeps the control bar out of the map's top edge, clear of the header).
  useImperativeHandle(ref, () => ({
    jumpTo,
    zoomBy,
    toggleFullscreen: () => setExpanded((v) => !v),
  }));
  useEffect(() => {
    onControlState?.({ preset, expanded });
  }, [preset, expanded, onControlState]);

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-40 flex flex-col bg-void p-2"
          : "flex h-full w-full flex-col"
      }
    >
      {/* In full-screen the map covers the header, so it carries its own controls. */}
      {expanded && (
        <div className="px-1 pb-1">
          <FlatControls
            preset={preset}
            expanded
            onJump={jumpTo}
            onZoom={zoomBy}
            onToggleFullscreen={() => setExpanded(false)}
          />
        </div>
      )}

      <div className="relative min-h-0 flex-1 p-2">
        <svg
          ref={svgRef}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          className="h-full w-full touch-none select-none"
          style={{ cursor: drag.current ? "grabbing" : "grab" }}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
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
              className="transition-colors hover:fill-neon/10"
            />
          ))}

          {points.map((p, i) => {
            const [x, y] = project(p.lng, p.lat);
            const r = (1.4 + p.size * 2.2) * zoomScale;
            return (
              <circle
                key={p.id ?? i}
                cx={x}
                cy={y}
                r={r}
                fill={SEVERITY_COLOR[p.severity] ?? "#38bdf8"}
                fillOpacity={0.85}
                className="cursor-pointer hover:opacity-100"
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
              r={2 * flash.scale}
              fill="none"
              stroke="#f43f5e"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              opacity={0.9}
            >
              <animate attributeName="r" from={2 * flash.scale} to={26 * flash.scale} dur="2s" fill="freeze" />
              <animate attributeName="opacity" from="0.9" to="0" dur="2s" fill="freeze" />
            </circle>
          )}

          {blasts.map((b) => (
            <circle
              key={b.key}
              cx={b.x}
              cy={b.y}
              r={2 * b.scale}
              fill="none"
              stroke="#f43f5e"
              strokeWidth={2.5}
              vectorEffect="non-scaling-stroke"
              opacity={1}
            >
              <animate attributeName="r" from={2 * b.scale} to={60 * b.scale} dur="2.2s" repeatCount="1" fill="freeze" />
              <animate attributeName="opacity" from="1" to="0" dur="2.2s" repeatCount="1" fill="freeze" />
            </circle>
          ))}
        </svg>

        <div className="pointer-events-none absolute bottom-2 right-3 font-mono text-[9px] uppercase tracking-widest text-slate-600">
          scroll to zoom · drag to pan
        </div>

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
});

export default FlatMap;
