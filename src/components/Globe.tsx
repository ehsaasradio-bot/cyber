"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GlobeGL, { type GlobeMethods } from "react-globe.gl";
import useSWR from "swr";

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
  lat: number;
  lng: number;
  size: number;
  severity: string;
  label: string;
  occurredAt: string;
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
  generatedAt: string;
}

export default function Globe({ window: win }: { window: "24h" | "7d" }) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const { data } = useSWR<GlobePayload>(`/api/globe?window=${win}`, fetcher, {
    refreshInterval: 60_000,
    keepPreviousData: true,
  });

  // Stable identities keyed on generatedAt so the globe doesn't rebuild on identical polls
  const generatedAt = data?.generatedAt;
  const points = useMemo(() => data?.points ?? [], [generatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const arcs = useMemo(() => data?.arcs ?? [], [generatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const rings = useMemo(
    () =>
      [...points]
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 10),
    [points],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Measure immediately — ResizeObserver callbacks don't fire in hidden tabs
    const rect = el.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0) setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Cinematic entrance: start far out, ease down to operating altitude
  const flyIn = () => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointOfView({ lat: 25, lng: 5, altitude: 4.5 }, 0);
    globe.pointOfView({ lat: 22, lng: 12, altitude: 2.3 }, 2600);
  };

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __cwGlobe?: GlobeMethods }).__cwGlobe = globeRef.current;
    }
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;

    const onVisibility = () => {
      controls.autoRotate = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
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
          globeImageUrl="/earth-night.jpg"
          showAtmosphere
          atmosphereColor="#22d3ee"
          atmosphereAltitude={0.18}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointLabel="label"
          pointColor={(p: object) => SEVERITY_COLOR[(p as GlobePoint).severity] ?? "#38bdf8"}
          pointAltitude={(p: object) => 0.01 + (p as GlobePoint).size * 0.05}
          pointRadius={(p: object) => 0.18 + (p as GlobePoint).size * 0.22}
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
          ringColor={(r: object) =>
            (t: number) => {
              const base = SEVERITY_COLOR[(r as GlobePoint).severity] ?? "#38bdf8";
              const alpha = Math.round((1 - t) * 160)
                .toString(16)
                .padStart(2, "0");
              return `${base}${alpha}`;
            }}
          ringMaxRadius={4}
          ringPropagationSpeed={1.5}
          ringRepeatPeriod={1800}
        />
      )}
    </div>
  );
}
