import { desc, gt, isNotNull, sql } from "drizzle-orm";
import { subDays, subHours } from "date-fns";
import { db } from "./db";
import { cves, threatEvents } from "./db/schema";

export type Window = "24h" | "7d";

export function windowStart(window: Window): Date {
  return window === "7d" ? subDays(new Date(), 7) : subHours(new Date(), 24);
}

const SEVERITY_ORDER = sql`case ${threatEvents.severity}
  when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`;

export async function geoEvents(window: Window, limit = 400) {
  return db
    .select({
      dedupKey: threatEvents.dedupKey,
      type: threatEvents.type,
      title: threatEvents.title,
      severity: threatEvents.severity,
      occurredAt: threatEvents.occurredAt,
      lat: threatEvents.lat,
      lon: threatEvents.lon,
      country: threatEvents.country,
      city: threatEvents.city,
    })
    .from(threatEvents)
    .where(
      sql`${threatEvents.lat} IS NOT NULL AND ${threatEvents.occurredAt} >= ${windowStart(window).toISOString()}::timestamptz`,
    )
    .orderBy(SEVERITY_ORDER, desc(threatEvents.occurredAt))
    .limit(limit);
}

export async function recentEvents(since: Date | null, limit = 50, severity?: string) {
  const conditions = [];
  if (since) conditions.push(gt(threatEvents.ingestedAt, since));
  if (severity) conditions.push(sql`${threatEvents.severity} = ${severity}`);
  const base = db
    .select({
      id: threatEvents.id,
      type: threatEvents.type,
      source: threatEvents.source,
      title: threatEvents.title,
      severity: threatEvents.severity,
      occurredAt: threatEvents.occurredAt,
      ingestedAt: threatEvents.ingestedAt,
      country: threatEvents.country,
      lat: threatEvents.lat,
      lon: threatEvents.lon,
      metadata: threatEvents.metadata,
    })
    .from(threatEvents)
    .orderBy(desc(threatEvents.occurredAt), desc(threatEvents.id))
    .limit(limit);
  return conditions.length ? base.where(sql.join(conditions, sql` AND `)) : base;
}

export async function topCves(limit = 15) {
  return db
    .select({
      cveId: cves.cveId,
      description: cves.description,
      cvssScore: cves.cvssScore,
      cvssSeverity: cves.cvssSeverity,
      epssScore: cves.epssScore,
      isKev: cves.isKev,
      kevRansomware: cves.kevRansomware,
      vendor: cves.vendor,
      product: cves.product,
      priorityScore: cves.priorityScore,
    })
    .from(cves)
    .orderBy(desc(cves.priorityScore))
    .limit(limit);
}

export interface TimelineBucket {
  ts: string;
  total: number;
  bySeverity: { critical: number; high: number; medium: number; low: number };
}

export async function timeline(window: Window): Promise<TimelineBucket[]> {
  const bucketHours = window === "7d" ? 6 : 1;
  const start = windowStart(window);
  const startIso = start.toISOString();
  const rows = await db.execute<{
    bucket: string;
    severity: string;
    n: number;
  }>(sql`
    SELECT
      date_bin(${sql.raw(`'${bucketHours} hours'`)}, occurred_at, ${startIso}::timestamptz) AS bucket,
      severity,
      count(*)::int AS n
    FROM threat_events
    WHERE occurred_at >= ${startIso}::timestamptz AND occurred_at <= now()
    GROUP BY 1, 2
    ORDER BY 1
  `);

  const buckets = new Map<string, TimelineBucket>();
  const bucketCount = window === "7d" ? 28 : 24;
  for (let i = 0; i < bucketCount; i++) {
    const ts = new Date(start.getTime() + i * bucketHours * 3_600_000).toISOString();
    buckets.set(ts, { ts, total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0 } });
  }
  for (const row of rows) {
    const ts = new Date(row.bucket).toISOString();
    const b = buckets.get(ts);
    if (!b) continue;
    b.total += row.n;
    const sev = row.severity as keyof TimelineBucket["bySeverity"];
    if (sev in b.bySeverity) b.bySeverity[sev] += row.n;
  }
  return [...buckets.values()];
}

export async function headlineStats() {
  const [events24h] = await db.execute<{ n: number }>(
    sql`SELECT count(*)::int AS n FROM threat_events WHERE occurred_at >= now() - interval '24 hours'`,
  );
  const [kev] = await db.execute<{ n: number }>(
    sql`SELECT count(*)::int AS n FROM cves WHERE is_kev`,
  );
  const [tracked] = await db.execute<{ n: number }>(
    sql`SELECT count(*)::int AS n FROM cves`,
  );
  return { events24h: events24h.n, kevCount: kev.n, trackedCves: tracked.n };
}
