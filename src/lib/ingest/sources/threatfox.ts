import type { NewThreatEvent } from "../../db/schema";
import { locateIp } from "../geo";
import { fetchWithTimeout, type FeedSource } from "../types";

const THREATFOX_URL = "https://threatfox-api.abuse.ch/api/v1/";

interface ThreatFoxIoc {
  id: string;
  ioc: string; // "1.2.3.4:443" for ip:port
  ioc_type: string; // ip:port | domain | url | ...
  threat_type: string; // botnet_cc | payload_delivery | ...
  malware_printable: string;
  confidence_level: number;
  first_seen: string; // "2026-07-04 09:00:00 UTC"
  reporter: string | null;
}

/**
 * ThreatFox IOCs (abuse.ch). Requires the same free ABUSECH_AUTH_KEY as URLhaus —
 * skipped when unset. Only geolocatable ip:port IOCs are ingested in this slice.
 */
export const threatfoxSource: FeedSource = {
  name: "threatfox",
  async run() {
    const key = process.env.ABUSECH_AUTH_KEY;
    if (!key) {
      return { itemsFetched: 0, events: [] };
    }

    const res = await fetchWithTimeout(THREATFOX_URL, {
      method: "POST",
      headers: { "Auth-Key": key, "content-type": "application/json" },
      body: JSON.stringify({ query: "get_iocs", days: 2 }),
    });
    const body = (await res.json()) as { query_status: string; data?: ThreatFoxIoc[] };
    if (body.query_status !== "ok") {
      throw new Error(`threatfox query_status: ${body.query_status}`);
    }

    const events: NewThreatEvent[] = [];
    for (const ioc of body.data ?? []) {
      if (ioc.ioc_type !== "ip:port") continue;
      const [ip, port] = ioc.ioc.split(":");
      const geo = locateIp(ip);
      if (!geo) continue;
      const isC2 = ioc.threat_type === "botnet_cc";
      events.push({
        dedupKey: `threatfox:${ioc.id}`,
        type: isC2 ? "c2_server" : "malware_url",
        source: "threatfox",
        title: isC2
          ? `${ioc.malware_printable} C2 server — ${ioc.ioc}`
          : `${ioc.malware_printable} infrastructure — ${ioc.ioc}`,
        description: `${ioc.threat_type} · confidence ${ioc.confidence_level}%${ioc.reporter ? ` · reported by ${ioc.reporter}` : ""}`,
        severity: ioc.confidence_level >= 75 ? "high" : "medium",
        occurredAt: new Date(ioc.first_seen.replace(" UTC", "Z").replace(" ", "T")),
        lat: geo.lat,
        lon: geo.lon,
        country: geo.country,
        city: geo.city,
        ip,
        metadata: {
          malware: ioc.malware_printable,
          port: Number(port) || null,
          threatType: ioc.threat_type,
          confidence: ioc.confidence_level,
        },
      });
    }

    return { itemsFetched: body.data?.length ?? 0, events };
  },
};
