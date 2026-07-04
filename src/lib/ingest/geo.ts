import geoip from "geoip-lite";

export interface GeoPoint {
  lat: number;
  lon: number;
  country: string | null;
  city: string | null;
}

/** Cheap deterministic hash for jitter seeding — same IP always lands in the same spot. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Look up an IP's coordinates. Many IPs geolocate to the same city centroid,
 * so apply a small deterministic jitter (±0.4°) to keep globe markers from stacking.
 */
export function locateIp(ip: string): GeoPoint | null {
  const geo = geoip.lookup(ip);
  if (!geo?.ll) return null;
  const [lat, lon] = geo.ll;
  const h = hash(ip);
  const jLat = (((h & 0xffff) / 0xffff) * 2 - 1) * 0.4;
  const jLon = ((((h >>> 16) & 0xffff) / 0xffff) * 2 - 1) * 0.4;
  return {
    lat: Math.max(-85, Math.min(85, lat + jLat)),
    lon: ((lon + jLon + 540) % 360) - 180,
    country: geo.country || null,
    city: geo.city || null,
  };
}
