import { NextRequest, NextResponse } from "next/server";
import { countryCounts, geoEvents, type Window } from "@/lib/queries";

/** Globe view modes → event-type filters (undefined = everything). */
const VIEW_TYPES: Record<string, string[] | undefined> = {
  all: undefined,
  ransomware: ["ransomware_victim"],
  c2: ["c2_server"],
  attack: ["attack_source"],
  malware: ["malware_url"],
  heat: undefined,
};

export const runtime = "nodejs";

/**
 * Arc destinations. Feeds tell us where threats live, not who they target,
 * so arcs flow toward major internet hubs — deterministically per event so
 * the globe stays stable across polls.
 */
const HUBS: [number, number][] = [
  [40.7, -74.0], // New York
  [51.5, -0.1], // London
  [35.7, 139.7], // Tokyo
  [1.35, 103.8], // Singapore
  [50.1, 8.7], // Frankfurt
  [-33.9, 151.2], // Sydney
  [-23.6, -46.6], // São Paulo
  [19.1, 72.9], // Mumbai
  [25.2, 55.3], // Dubai
  [34.1, -118.2], // Los Angeles
  [41.9, -87.6], // Chicago
  [43.7, -79.4], // Toronto
  [48.9, 2.4], // Paris
  [52.4, 4.9], // Amsterdam
  [59.3, 18.1], // Stockholm
  [37.6, 127.0], // Seoul
  [22.3, 114.2], // Hong Kong
  [31.2, 121.5], // Shanghai
  [-26.2, 28.0], // Johannesburg
  [6.5, 3.4], // Lagos
  [19.4, -99.1], // Mexico City
  [-34.6, -58.4], // Buenos Aires
  [40.4, -3.7], // Madrid
  [52.2, 21.0], // Warsaw
  [32.1, 34.8], // Tel Aviv
];

const SIZE: Record<string, number> = { critical: 1.0, high: 0.7, medium: 0.45, low: 0.3 };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function GET(req: NextRequest) {
  const window = (req.nextUrl.searchParams.get("window") === "7d" ? "7d" : "24h") as Window;
  const view = req.nextUrl.searchParams.get("view") ?? "all";
  const industry = req.nextUrl.searchParams.get("industry") ?? undefined;
  const [events, byCountry] = await Promise.all([
    geoEvents(window, 400, VIEW_TYPES[view], industry),
    countryCounts(window),
  ]);

  const points = events.map((e) => ({
    id: e.dedupKey,
    lat: e.lat!,
    lng: e.lon!,
    size: SIZE[e.severity] ?? 0.3,
    severity: e.severity,
    type: e.type,
    source: e.source,
    title: e.title,
    label: `${e.title}${e.country ? ` · ${e.country}` : ""}`,
    occurredAt: e.occurredAt,
    country: e.country?.trim() ?? null,
    city: e.city,
    ip: e.ip,
    metadata: e.metadata,
  }));

  const arcs =
    view === "heat"
      ? []
      : events.slice(0, 60).map((e) => {
          const [endLat, endLng] = HUBS[hash(e.dedupKey) % HUBS.length];
          return { startLat: e.lat!, startLng: e.lon!, endLat, endLng, severity: e.severity };
        });

  return NextResponse.json({
    points,
    arcs,
    countryCounts: byCountry,
    generatedAt: new Date().toISOString(),
  });
}
