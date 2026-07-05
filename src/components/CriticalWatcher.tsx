"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/format";
import { emitCriticalPulse } from "@/lib/criticalPulse";

interface Point {
  id: string;
  lat: number;
  lng: number;
  severity: string;
  title: string;
}

/**
 * Headless poller: watches for brand-new critical geolocated events and fires
 * the shared criticalPulse bus (drives blast-radius rings + storm lightning).
 * Mount exactly once — Globe/FlatMap/StormOverlay all subscribe, none poll.
 */
export default function CriticalWatcher() {
  const { data } = useSWR<{ points: Point[] }>("/api/globe?window=24h&view=all", fetcher, {
    refreshInterval: 20_000,
  });
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __cwEmitCritical?: typeof emitCriticalPulse }).__cwEmitCritical =
        emitCriticalPulse;
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    const criticals = data.points.filter((p) => p.severity === "critical");
    if (!seen.current) {
      // First load: baseline silently, don't blast for pre-existing events.
      seen.current = new Set(criticals.map((p) => p.id));
      return;
    }
    let emitted = 0;
    for (const p of criticals) {
      if (seen.current.has(p.id)) continue;
      seen.current.add(p.id);
      if (emitted++ < 3) {
        emitCriticalPulse({ lat: p.lat, lng: p.lng, severity: p.severity, title: p.title });
      }
    }
  }, [data]);

  return null;
}
