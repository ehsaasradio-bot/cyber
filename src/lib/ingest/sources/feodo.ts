import type { NewThreatEvent } from "../../db/schema";
import { locateIp } from "../geo";
import { fetchWithTimeout, type FeedSource } from "../types";

const FEODO_URL = "https://feodotracker.abuse.ch/downloads/ipblocklist.json";

interface FeodoEntry {
  ip_address: string;
  port: number;
  status: string;
  hostname: string | null;
  as_number: number;
  as_name: string;
  country: string;
  first_seen: string;
  last_online: string | null;
  malware: string;
}

export const feodoSource: FeedSource = {
  name: "feodo",
  async run() {
    const res = await fetchWithTimeout(FEODO_URL);
    const entries = (await res.json()) as FeodoEntry[];

    const events: NewThreatEvent[] = [];
    for (const e of entries) {
      const geo = locateIp(e.ip_address);
      events.push({
        dedupKey: `feodo:${e.ip_address}:${e.port}`,
        type: "c2_server",
        source: "feodo",
        title: `${e.malware} C2 server — ${e.ip_address}:${e.port}`,
        description: `Botnet command & control (${e.malware}), ${e.as_name ?? "unknown AS"}`,
        severity: e.status === "online" ? "critical" : "high",
        occurredAt: new Date(e.last_online ?? e.first_seen),
        lat: geo?.lat,
        lon: geo?.lon,
        country: geo?.country ?? (e.country?.slice(0, 2) || null),
        city: geo?.city,
        ip: e.ip_address,
        metadata: {
          malware: e.malware,
          port: e.port,
          asn: e.as_number,
          asName: e.as_name,
          status: e.status,
        },
      });
    }

    return { itemsFetched: entries.length, events };
  },
};
