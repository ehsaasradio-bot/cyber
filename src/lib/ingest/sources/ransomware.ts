import type { NewThreatEvent } from "../../db/schema";
import { countryCentroid } from "../countryCentroids";
import { fetchWithTimeout, sleep, type Cursor, type FeedSource } from "../types";

const BASE = "https://api.ransomware.live/v2";
/** Months of victim history to backfill on the first run (dedup makes reruns free). */
const BACKFILL_MONTHS = 3;

interface Victim {
  victim: string;
  group: string;
  attackdate: string | null;
  discovered: string;
  country: string | null;
  activity: string | null;
  domain: string | null;
  url: string | null; // ransomware.live victim page — safe to surface
}

function monthsToFetch(cursor: Cursor | null): [number, number][] {
  const now = new Date();
  const span = cursor?.lastMonth ? 2 : BACKFILL_MONTHS; // steady-state: current + previous
  const out: [number, number][] = [];
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push([d.getUTCFullYear(), d.getUTCMonth() + 1]);
  }
  return out;
}

function toEvent(v: Victim): NewThreatEvent | null {
  const when = v.attackdate ?? v.discovered;
  if (!v.victim || !v.group || !when) return null;
  const day = when.slice(0, 10);
  const country = v.country && /^[A-Za-z]{2}$/.test(v.country) ? v.country.toUpperCase() : null;
  const geo = country ? countryCentroid(country, `${v.victim}|${v.group}`) : null;
  return {
    dedupKey: `rw:${v.group}:${v.victim.slice(0, 80)}:${day}`,
    type: "ransomware_victim",
    source: "ransomware_live",
    title: `Ransomware attack — ${v.victim} (${v.group})`,
    description: [v.activity, v.domain].filter(Boolean).join(" · ") || null,
    severity: "critical",
    occurredAt: new Date(when),
    lat: geo?.lat,
    lon: geo?.lon,
    country,
    metadata: {
      group: v.group,
      victim: v.victim,
      sector: v.activity,
      domain: v.domain,
      page: v.url,
    },
  };
}

export const ransomwareSource: FeedSource = {
  name: "ransomware_live",
  async run(cursor) {
    const events: NewThreatEvent[] = [];
    let fetched = 0;

    for (const [year, month] of monthsToFetch(cursor)) {
      const res = await fetchWithTimeout(`${BASE}/victims/${year}/${month}`, {}, 90_000);
      const victims = (await res.json()) as Victim[];
      fetched += victims.length;
      for (const v of victims) {
        const e = toEvent(v);
        if (e) events.push(e);
      }
      await sleep(1_000);
    }

    const now = new Date();
    return {
      itemsFetched: fetched,
      events,
      nextCursor: {
        lastMonth: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`,
      },
    };
  },
};
