import type { NewThreatEvent } from "../../db/schema";
import { locateIp } from "../geo";
import { fetchWithTimeout, type FeedSource } from "../types";

const URLHAUS_URL = "https://urlhaus-api.abuse.ch/v1/urls/recent/limit/250/";

interface UrlhausEntry {
  id: string;
  url: string;
  host: string;
  date_added: string;
  threat: string;
  url_status: string;
  tags: string[] | null;
}

const IP_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

/** Requires a free abuse.ch Auth-Key (https://auth.abuse.ch/) — skipped when unset. */
export const urlhausSource: FeedSource = {
  name: "urlhaus",
  async run() {
    const key = process.env.ABUSECH_AUTH_KEY;
    if (!key) {
      return { itemsFetched: 0, events: [] };
    }

    const res = await fetchWithTimeout(URLHAUS_URL, {
      method: "POST",
      headers: { "Auth-Key": key },
    });
    const body = (await res.json()) as { query_status: string; urls?: UrlhausEntry[] };
    if (body.query_status !== "ok") {
      throw new Error(`URLhaus query_status: ${body.query_status}`);
    }

    const events: NewThreatEvent[] = [];
    for (const u of body.urls ?? []) {
      // Domain hosts would need DNS resolution — IP-hosted malware URLs only in this slice
      if (!IP_RE.test(u.host)) continue;
      const geo = locateIp(u.host);
      if (!geo) continue;
      events.push({
        dedupKey: `urlhaus:${u.id}`,
        type: "malware_url",
        source: "urlhaus",
        title: `Malware distribution URL — ${u.host} (${u.threat})`,
        description: u.url.slice(0, 200),
        severity: u.url_status === "online" ? "high" : "medium",
        occurredAt: new Date(u.date_added),
        lat: geo.lat,
        lon: geo.lon,
        country: geo.country,
        city: geo.city,
        ip: u.host,
        metadata: { threat: u.threat, tags: u.tags ?? [], urlStatus: u.url_status },
      });
    }

    return { itemsFetched: body.urls?.length ?? 0, events };
  },
};
