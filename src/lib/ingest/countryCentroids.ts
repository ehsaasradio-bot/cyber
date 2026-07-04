import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Rough country centroids derived from the bundled borders GeoJSON —
 * ransomware feeds only give a country code, so victims land near the
 * middle of their country with a per-victim jitter to avoid stacking.
 */

interface GeoFeature {
  properties: { ISO_A2: string; ISO_A2_EH?: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
}

let centroids: Map<string, [number, number]> | null = null;

function ringCentroid(ring: number[][]): [number, number, number] {
  let lat = 0;
  let lon = 0;
  for (const [x, y] of ring) {
    lon += x;
    lat += y;
  }
  return [lat / ring.length, lon / ring.length, ring.length];
}

function load(): Map<string, [number, number]> {
  if (centroids) return centroids;
  centroids = new Map();
  try {
    const geo = JSON.parse(
      readFileSync(join(process.cwd(), "public", "countries.geojson"), "utf8"),
    ) as { features: GeoFeature[] };
    for (const f of geo.features) {
      const iso = f.properties.ISO_A2 !== "-99" ? f.properties.ISO_A2 : f.properties.ISO_A2_EH;
      if (!iso) continue;
      // Use the largest ring (mainland) so island nations don't average into the sea
      const rings =
        f.geometry.type === "Polygon"
          ? [(f.geometry.coordinates as number[][][])[0]]
          : (f.geometry.coordinates as number[][][][]).map((p) => p[0]);
      let best: [number, number, number] | null = null;
      for (const ring of rings) {
        const c = ringCentroid(ring);
        if (!best || c[2] > best[2]) best = c;
      }
      if (best) centroids.set(iso, [best[0], best[1]]);
    }
  } catch {
    // fall through — callers treat missing centroid as "no geo"
  }
  return centroids;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function countryCentroid(
  iso2: string,
  jitterSeed?: string,
): { lat: number; lon: number } | null {
  const c = load().get(iso2.toUpperCase());
  if (!c) return null;
  let [lat, lon] = c;
  if (jitterSeed) {
    const h = hash(jitterSeed);
    lat += (((h & 0xffff) / 0xffff) * 2 - 1) * 1.5;
    lon += ((((h >>> 16) & 0xffff) / 0xffff) * 2 - 1) * 1.5;
  }
  return { lat: Math.max(-85, Math.min(85, lat)), lon: ((lon + 540) % 360) - 180 };
}
