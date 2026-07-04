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

/* --------------------------- Sector & group detail ------------------------ */

export { slugify } from "./format";
import { slugify } from "./format";

async function weeklyVictims(where: ReturnType<typeof sql>): Promise<{ week: string; victims: number }[]> {
  const rows = await db.execute<{ week: string; n: number }>(sql`
    SELECT to_char(date_trunc('week', occurred_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS week, count(*)::int AS n
    FROM threat_events
    WHERE type = 'ransomware_victim' AND occurred_at >= now() - interval '84 days' AND ${where}
    GROUP BY 1 ORDER BY 1
  `);
  const byWeek = new Map(rows.map((r) => [r.week, r.n]));
  const out: { week: string; victims: number }[] = [];
  const monday = new Date();
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  for (let i = 11; i >= 0; i--) {
    const w = new Date(monday);
    w.setUTCDate(w.getUTCDate() - i * 7);
    const key = w.toISOString().slice(0, 10);
    out.push({ week: key, victims: byWeek.get(key) ?? 0 });
  }
  return out;
}

export async function listSectors() {
  const rows = await db.execute<{ sector: string; n: number }>(sql`
    SELECT metadata->>'sector' AS sector, count(*)::int AS n
    FROM threat_events
    WHERE type = 'ransomware_victim' AND occurred_at >= now() - interval '90 days'
      AND metadata->>'sector' IS NOT NULL AND metadata->>'sector' != '' AND metadata->>'sector' != 'Not Found'
    GROUP BY 1 ORDER BY 2 DESC
  `);
  return rows.map((r) => ({ name: r.sector, slug: slugify(r.sector), victims: r.n }));
}

export async function getSectorDetail(slug: string) {
  const sectors = await listSectors();
  const match = sectors.find((s) => s.slug === slug);
  if (!match) return null;
  const name = match.name;

  const weekly = await weeklyVictims(sql`metadata->>'sector' = ${name}`);
  const groups = await db.execute<{ grp: string; n: number }>(sql`
    SELECT metadata->>'group' AS grp, count(*)::int AS n FROM threat_events
    WHERE type = 'ransomware_victim' AND metadata->>'sector' = ${name}
      AND occurred_at >= now() - interval '90 days'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 8
  `);
  const countries = await db.execute<{ country: string; n: number }>(sql`
    SELECT country, count(*)::int AS n FROM threat_events
    WHERE type = 'ransomware_victim' AND metadata->>'sector' = ${name}
      AND country IS NOT NULL AND occurred_at >= now() - interval '90 days'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 8
  `);
  const victims = await db
    .select({
      id: threatEvents.id,
      title: threatEvents.title,
      occurredAt: threatEvents.occurredAt,
      country: threatEvents.country,
      metadata: threatEvents.metadata,
    })
    .from(threatEvents)
    .where(sql`${threatEvents.type} = 'ransomware_victim' AND ${threatEvents.metadata}->>'sector' = ${name}`)
    .orderBy(desc(threatEvents.occurredAt))
    .limit(30);

  return {
    name,
    slug,
    totalVictims90d: match.victims,
    victims14d: weekly.slice(-2).reduce((s, w) => s + w.victims, 0),
    weekly,
    groups: [...groups].map((g) => ({ name: g.grp, victims: g.n })),
    countries: [...countries].map((c) => ({ country: c.country.trim(), victims: c.n })),
    victims,
  };
}

export async function getGroupDetail(slug: string) {
  const rows = await db.execute<{ grp: string; n: number }>(sql`
    SELECT metadata->>'group' AS grp, count(*)::int AS n
    FROM threat_events
    WHERE type = 'ransomware_victim' AND metadata->>'group' IS NOT NULL
    GROUP BY 1
  `);
  const match = rows.find((r) => slugify(r.grp) === slug);
  if (!match) return null;
  const name = match.grp;

  const weekly = await weeklyVictims(sql`metadata->>'group' = ${name}`);
  const sectors = await db.execute<{ sector: string; n: number }>(sql`
    SELECT metadata->>'sector' AS sector, count(*)::int AS n FROM threat_events
    WHERE type = 'ransomware_victim' AND metadata->>'group' = ${name}
      AND metadata->>'sector' IS NOT NULL AND metadata->>'sector' != '' AND metadata->>'sector' != 'Not Found'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 8
  `);
  const countries = await db.execute<{ country: string; n: number }>(sql`
    SELECT country, count(*)::int AS n FROM threat_events
    WHERE type = 'ransomware_victim' AND metadata->>'group' = ${name} AND country IS NOT NULL
    GROUP BY 1 ORDER BY 2 DESC LIMIT 8
  `);
  const victims = await db
    .select({
      id: threatEvents.id,
      title: threatEvents.title,
      occurredAt: threatEvents.occurredAt,
      country: threatEvents.country,
      metadata: threatEvents.metadata,
    })
    .from(threatEvents)
    .where(sql`${threatEvents.type} = 'ransomware_victim' AND ${threatEvents.metadata}->>'group' = ${name}`)
    .orderBy(desc(threatEvents.occurredAt))
    .limit(30);

  return {
    name,
    slug,
    totalVictims: match.n,
    weekly,
    sectors: [...sectors].map((s) => ({ name: s.sector, victims: s.n })),
    countries: [...countries].map((c) => ({ country: c.country.trim(), victims: c.n })),
    victims,
  };
}
