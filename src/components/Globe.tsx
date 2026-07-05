"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GlobeGL, { type GlobeMethods } from "react-globe.gl";
import useSWR from "swr";
import {
  onGlobeFocus,
  selectGlobeEvent,
  type GlobeFocus,
} from "@/lib/globeBus";
import { onCriticalPulse } from "@/lib/criticalPulse";
import type { GlobeView } from "./ViewSelect";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#f43f5e",
  high: "#fb923c",
  medium: "#facc15",
  low: "#38bdf8",
};

const ARC_COLOR: Record<string, [string, string]> = {
  critical: ["rgba(244,63,94,0.75)", "rgba(244,63,94,0.05)"],
  high: ["rgba(251,146,60,0.65)", "rgba(251,146,60,0.05)"],
  medium: ["rgba(250,204,21,0.5)", "rgba(250,204,21,0.05)"],
  low: ["rgba(56,189,248,0.5)", "rgba(56,189,248,0.05)"],
};

interface GlobePoint {
  id: string;
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

interface GlobeArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  severity: string;
}

interface GlobePayload {
  points: GlobePoint[];
  arcs: GlobeArc[];
  countryCounts: Record<string, number>;
  generatedAt: string;
}

interface RingDatum {
  lat: number;
  lng: number;
  severity: string;
  isFocus?: boolean;
  isBlast?: boolean;
}

interface CountryFeature {
  properties: { ADMIN: string; ISO_A2: string; ISO_A2_EH?: string };
}

const FOCUS_ALTITUDE = 0.7;
const FOCUS_HOLD_MS = 9_000;
/** Below this camera altitude the deep view kicks in: per-event IP/city labels. */
const DEEP_ALTITUDE = 0.9;

function countryIso(d: CountryFeature): string {
  const iso = d.properties.ISO_A2;
  return iso && iso !== "-99" ? iso : (d.properties.ISO_A2_EH ?? "");
}

/** Log-scaled fill for the resilience choropleth. */
function heatColor(count: number, max: number): string {
  if (!count) return "rgba(34,211,238,0.02)";
  const t = Math.log1p(count) / Math.log1p(Math.max(max, 2));
  return `rgba(244,63,94,${(0.06 + t * 0.5).toFixed(3)})`;
}

export default function Globe({
  window: win,
  view,
  industry,
  overridePoints,
}: {
  window: "24h" | "7d";
  view: GlobeView;
  industry?: string | null;
  /** Replay mode: when set, these points replace live data and arcs are hidden. */
  overridePoints?: GlobePoint[] | null;
}) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [hoverCountry, setHoverCountry] = useState<object | null>(null);
  const [focus, setFocus] = useState<(GlobeFocus & { at: number }) | null>(null);
  const [deep, setDeep] = useState(false);
  const [blasts, setBlasts] = useState<(RingDatum & { key: number })[]>([]);

  const { data } = useSWR<GlobePayload>(
    `/api/globe?window=${win}&view=${view}${industry ? `&industry=${industry}` : ""}`,
    fetcher,
    { refreshInterval: 60_000, keepPreviousData: true },
  );

  // Stable identities keyed on generatedAt so the globe doesn't rebuild on identical polls
  const generatedAt = data?.generatedAt;
  const livePoints = useMemo(() => data?.points ?? [], [generatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const liveArcs = useMemo(() => data?.arcs ?? [], [generatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const points = overridePoints ?? livePoints;
  const arcs = overridePoints ? [] : liveArcs;
  const counts = data?.countryCounts ?? {};
  const maxCount = useMemo(() => Math.max(1, ...Object.values(counts)), [counts]);

  const rings = useMemo<RingDatum[]>(() => {
    const newest: RingDatum[] = [...points]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 10)
      .map((p) => ({ lat: p.lat, lng: p.lng, severity: p.severity }));
    // Criticals always ping, even when they aren't the newest events
    const criticals: RingDatum[] = points
      .filter((p) => p.severity === "critical")
      .slice(0, 8)
      .map((p) => ({ lat: p.lat, lng: p.lng, severity: p.severity }));
    const merged: RingDatum[] = [...newest, ...criticals];
    if (focus) {
      merged.push({
        lat: focus.lat,
        lng: focus.lng,
        severity: focus.severity ?? "critical",
        isFocus: true,
      });
    }
    for (const b of blasts) merged.push(b);
    return merged;
  }, [points, focus, blasts]);

  // Blast radius: a brief, oversized shockwave ring for brand-new critical events
  useEffect(
    () =>
      onCriticalPulse((e) => {
        const key = Date.now();
        setBlasts((prev) => [
          ...prev,
          { lat: e.lat, lng: e.lng, severity: e.severity, isBlast: true, key },
        ]);
        setTimeout(() => setBlasts((prev) => prev.filter((b) => b.key !== key)), 6_000);
      }),
    [],
  );

  // Deep view: label the most severe events on screen once the user zooms in
  const labels = useMemo(
    () => (deep ? points.slice(0, 120) : []),
    [deep, points],
  );

  useEffect(() => {
    fetch("/countries.geojson")
      .then((r) => r.json())
      .then((geo) => setCountries(geo.features ?? []))
      .catch(() => {}); // borders are decorative — the globe works without them
  }, []);

  // Cinematic entrance: start far out, ease down to operating altitude
  const flyIn = () => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointOfView({ lat: 25, lng: 5, altitude: 4.5 }, 0);
    globe.pointOfView({ lat: 22, lng: 12, altitude: 2.3 }, 2600);
  };

  const flyTo = (target: GlobeFocus, altitude = FOCUS_ALTITUDE) => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointOfView({ lat: target.lat, lng: target.lng, altitude }, 1_400);
    setFocus({ ...target, at: Date.now() });
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => setFocus(null), FOCUS_HOLD_MS);
  };

  useEffect(() => onGlobeFocus((f) => flyTo(f)), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Measure immediately, then retry until layout exists — ResizeObserver
    // callbacks and rAF don't fire in hidden/background tabs
    let retry: ReturnType<typeof setTimeout> | null = null;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setSize({ width: rect.width, height: rect.height });
      } else {
        retry = setTimeout(measure, 1_000);
      }
    };
    measure();
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0) setSize({ width, height });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (retry) clearTimeout(retry);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __cwGlobe?: GlobeMethods }).__cwGlobe = globeRef.current;
    }
    // The user drives the globe — no auto-rotation
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.autoRotate = false;
      controls.zoomSpeed = 1.4;
    }
  }, [size.width]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {size.width > 0 && (
        <GlobeGL
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          rendererConfig={{ preserveDrawingBuffer: true }}
          onGlobeReady={flyIn}
          onZoom={(pov: { altitude: number }) => setDeep(pov.altitude < DEEP_ALTITUDE)}
          globeImageUrl="/earth-night.jpg"
          showAtmosphere
          atmosphereColor="#22d3ee"
          atmosphereAltitude={0.18}
          polygonsData={countries}
          polygonAltitude={0.005}
          polygonCapColor={(d: object) => {
            if (view === "heat") {
              return heatColor(counts[countryIso(d as CountryFeature)] ?? 0, maxCount);
            }
            return d === hoverCountry ? "rgba(34,211,238,0.14)" : "rgba(34,211,238,0.025)";
          }}
          polygonSideColor={() => "rgba(0,0,0,0)"}
          polygonStrokeColor={(d: object) =>
            d === hoverCountry ? "rgba(34,211,238,0.9)" : "rgba(34,211,238,0.28)"
          }
          polygonLabel={(d: object) => {
            const c = d as CountryFeature;
            const iso = countryIso(c);
            const n = counts[iso] ?? 0;
            return `${c.properties.ADMIN} (${iso}) — ${n} event${n === 1 ? "" : "s"} in ${win}`;
          }}
          onPolygonClick={(d: object) => {
            const iso = countryIso(d as CountryFeature);
            if (iso) window.location.href = `/country/${iso}`;
          }}
          onPolygonHover={(d: object | null) => setHoverCountry(d)}
          polygonsTransitionDuration={0}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointLabel="label"
          pointColor={(p: object) => SEVERITY_COLOR[(p as GlobePoint).severity] ?? "#38bdf8"}
          pointAltitude={(p: object) => 0.012 + (p as GlobePoint).size * 0.05}
          pointRadius={(p: object) => 0.18 + (p as GlobePoint).size * 0.22}
          onPointClick={(p: object) => {
            const pt = p as GlobePoint;
            flyTo({ lat: pt.lat, lng: pt.lng, label: pt.title, severity: pt.severity }, 0.5);
            selectGlobeEvent({
              title: pt.title,
              severity: pt.severity,
              type: pt.type,
              source: pt.source,
              ip: pt.ip,
              country: pt.country,
              city: pt.city,
              occurredAt: pt.occurredAt,
              metadata: pt.metadata,
            });
          }}
          labelsData={labels}
          labelLat="lat"
          labelLng="lng"
          labelText={(l: object) => {
            const p = l as GlobePoint;
            return p.ip ?? p.city ?? p.country ?? "";
          }}
          labelSize={0.28}
          labelDotRadius={0.12}
          labelColor={(l: object) => SEVERITY_COLOR[(l as GlobePoint).severity] ?? "#38bdf8"}
          labelResolution={2}
          labelAltitude={0.015}
          arcsData={arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor={(a: object) => ARC_COLOR[(a as GlobeArc).severity] ?? ARC_COLOR.low}
          arcAltitudeAutoScale={0.4}
          arcStroke={0.35}
          arcDashLength={0.45}
          arcDashGap={1.6}
          arcDashAnimateTime={(_: object, i?: number) => 2500 + ((i ?? 0) % 5) * 450}
          ringsData={rings}
          ringLat="lat"
          ringLng="lng"
          ringColor={(r: object) => {
            const ring = r as RingDatum;
            const base = ring.isBlast ? "#f43f5e" : SEVERITY_COLOR[ring.severity] ?? "#38bdf8";
            return (t: number) => {
              const alpha = Math.round((1 - t) * (ring.isFocus || ring.isBlast ? 220 : 160))
                .toString(16)
                .padStart(2, "0");
              return `${base}${alpha}`;
            };
          }}
          ringMaxRadius={(r: object) => {
            const ring = r as RingDatum;
            if (ring.isBlast) return 16;
            return ring.isFocus ? 9 : ring.severity === "critical" ? 6 : 3.5;
          }}
          ringPropagationSpeed={(r: object) => {
            const ring = r as RingDatum;
            return ring.isBlast ? 4.5 : ring.isFocus ? 3 : 1.5;
          }}
          ringRepeatPeriod={(r: object) => {
            const ring = r as RingDatum;
            if (ring.isBlast) return 700;
            return ring.isFocus ? 900 : ring.severity === "critical" ? 1200 : 1800;
          }}
        />
      )}
    </div>
  );
}
