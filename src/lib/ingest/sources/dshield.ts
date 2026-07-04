import type { NewThreatEvent } from "../../db/schema";
import { locateIp } from "../geo";
import { fetchWithTimeout, type FeedSource } from "../types";

const DSHIELD_URL = "https://isc.sans.edu/api/topips/records/100?json";

interface DshieldEntry {
  source: string; // IP, sometimes zero-padded octets
  reports: string | number;
  targets: string | number;
}

/** DShield zero-pads octets (e.g. "089.248.165.052") — normalize before geolocation. */
function normalizeIp(raw: string): string {
  return raw
    .split(".")
    .map((o) => String(parseInt(o, 10)))
    .join(".");
}

function severityFor(reports: number): string {
  if (reports >= 100_000) return "high";
  if (reports >= 10_000) return "medium";
  return "low";
}

export const dshieldSource: FeedSource = {
  name: "dshield",
  async run() {
    const res = await fetchWithTimeout(DSHIELD_URL);
    const body = (await res.json()) as { topips?: DshieldEntry[] } | DshieldEntry[];
    const entries = Array.isArray(body) ? body : (body.topips ?? []);

    const today = new Date().toISOString().slice(0, 10);
    const events: NewThreatEvent[] = [];
    for (const e of entries) {
      if (!e?.source) continue;
      const ip = normalizeIp(e.source);
      const reports = Number(e.reports) || 0;
      const geo = locateIp(ip);
      events.push({
        dedupKey: `dshield:${ip}:${today}`,
        type: "attack_source",
        source: "dshield",
        title: `Mass scanning/attack source — ${ip}`,
        description: `${reports.toLocaleString()} reports against ${Number(e.targets).toLocaleString()} targets (SANS ISC honeypots)`,
        severity: severityFor(reports),
        occurredAt: new Date(),
        lat: geo?.lat,
        lon: geo?.lon,
        country: geo?.country,
        city: geo?.city,
        ip,
        metadata: { reports, targets: Number(e.targets) || 0 },
      });
    }

    return { itemsFetched: entries.length, events };
  },
};
