import { readFileSync } from "node:fs";
import { join } from "node:path";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { cves, threatEvents } from "./db/schema";

/* ------------------------------- CVE detail ------------------------------ */

export async function getCveDetail(cveId: string) {
  const [cve] = await db.select().from(cves).where(eq(cves.cveId, cveId)).limit(1);
  if (!cve) return null;
  const related = await db
    .select({
      id: threatEvents.id,
      type: threatEvents.type,
      source: threatEvents.source,
      title: threatEvents.title,
      severity: threatEvents.severity,
      occurredAt: threatEvents.occurredAt,
      country: threatEvents.country,
    })
    .from(threatEvents)
    .where(sql`${threatEvents.metadata}->>'cveId' = ${cveId}`)
    .orderBy(desc(threatEvents.occurredAt))
    .limit(20);
  return { cve, related };
}

/* ----------------------------- Country detail ---------------------------- */

let countryNames: Map<string, string> | null = null;

export function countryName(iso2: string): string {
  if (!countryNames) {
    countryNames = new Map();
    try {
      const geo = JSON.parse(
        readFileSync(join(process.cwd(), "public", "countries.geojson"), "utf8"),
      ) as { features: { properties: { ADMIN: string; ISO_A2: string; ISO_A2_EH?: string } }[] };
      for (const f of geo.features) {
        const iso = f.properties.ISO_A2 !== "-99" ? f.properties.ISO_A2 : f.properties.ISO_A2_EH;
        if (iso) countryNames.set(iso, f.properties.ADMIN);
      }
    } catch {
      // name lookup is cosmetic
    }
  }
  return countryNames.get(iso2.toUpperCase()) ?? iso2.toUpperCase();
}

export async function getCountryDetail(iso2: string) {
  const cc = iso2.toUpperCase();
  const [stats] = await db.execute<{
    events7d: number;
    critical7d: number;
    ransomware90d: number;
  }>(sql`
    SELECT
      count(*) FILTER (WHERE occurred_at >= now() - interval '7 days')::int AS "events7d",
      count(*) FILTER (WHERE occurred_at >= now() - interval '7 days' AND severity = 'critical')::int AS "critical7d",
      count(*) FILTER (WHERE occurred_at >= now() - interval '90 days' AND type = 'ransomware_victim')::int AS "ransomware90d"
    FROM threat_events WHERE country = ${cc}
  `);

  const byType = await db.execute<{ type: string; n: number }>(sql`
    SELECT type, count(*)::int AS n
    FROM threat_events
    WHERE country = ${cc} AND occurred_at >= now() - interval '90 days'
    GROUP BY 1 ORDER BY 2 DESC
  `);

  const byDayRows = await db.execute<{ day: string; n: number }>(sql`
    SELECT to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, count(*)::int AS n
    FROM threat_events
    WHERE country = ${cc} AND occurred_at >= now() - interval '14 days'
    GROUP BY 1 ORDER BY 1
  `);
  const byDayMap = new Map(byDayRows.map((r) => [r.day, r.n]));
  const byDay: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    byDay.push({ date: d, count: byDayMap.get(d) ?? 0 });
  }

  const events = await db
    .select({
      id: threatEvents.id,
      type: threatEvents.type,
      source: threatEvents.source,
      title: threatEvents.title,
      severity: threatEvents.severity,
      occurredAt: threatEvents.occurredAt,
      ip: threatEvents.ip,
      metadata: threatEvents.metadata,
    })
    .from(threatEvents)
    .where(eq(threatEvents.country, cc))
    .orderBy(desc(threatEvents.occurredAt))
    .limit(30);

  return { cc, name: countryName(cc), stats, byType: [...byType], byDay, events };
}
