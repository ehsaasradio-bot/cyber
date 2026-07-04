import { sql } from "drizzle-orm";
import { db } from "./db";

/** Last n calendar months as "YYYY-MM", oldest→newest (UTC, includes current month). */
function lastMonths(n: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  return months;
}

/** Last n calendar days as "YYYY-MM-DD", oldest→newest (UTC, includes today). */
function lastDays(n: number): string[] {
  const now = new Date();
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i),
    );
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export interface KevMonth {
  month: string;
  total: number;
  ransomware: number;
}

/** KEV additions per month for the last 24 months (missing months zero-filled). */
export async function kevMonthly(): Promise<KevMonth[]> {
  const months = lastMonths(24);
  const startIso = `${months[0]}-01`;
  const rows = await db.execute<{ month: string; total: number; ransomware: number }>(sql`
    SELECT
      to_char(kev_date_added, 'YYYY-MM') AS month,
      count(*)::int AS total,
      count(*) FILTER (WHERE kev_ransomware)::int AS ransomware
    FROM cves
    WHERE is_kev AND kev_date_added >= ${startIso}::date
    GROUP BY 1
  `);
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  return months.map((month) => ({
    month,
    total: byMonth.get(month)?.total ?? 0,
    ransomware: byMonth.get(month)?.ransomware ?? 0,
  }));
}

export interface RiskMatrixCve {
  cveId: string;
  cvss: number;
  epss: number;
  isKev: boolean;
  priorityScore: number;
}

/** CVEs with both CVSS and EPSS scores, ordered by priority — drives the risk scatter. */
export async function riskMatrix(limit = 400): Promise<RiskMatrixCve[]> {
  const rows = await db.execute<{
    cve_id: string;
    cvss: number;
    epss: number;
    is_kev: boolean;
    priority: number;
  }>(sql`
    SELECT
      cve_id,
      cvss_score::float8 AS cvss,
      epss_score::float8 AS epss,
      is_kev,
      priority_score::float8 AS priority
    FROM cves
    WHERE cvss_score IS NOT NULL AND epss_score IS NOT NULL
    ORDER BY priority_score DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({
    cveId: r.cve_id,
    cvss: r.cvss,
    epss: r.epss,
    isKev: r.is_kev,
    priorityScore: r.priority,
  }));
}

export interface EpssBucket {
  lo: number;
  hi: number;
  count: number;
}

export interface EpssDistribution {
  buckets: EpssBucket[];
  kevCount: number;
  total: number;
}

/** Histogram of EPSS scores in 10 equal buckets [0,0.1)…[0.9,1.0]. */
export async function epssDistribution(): Promise<EpssDistribution> {
  const rows = await db.execute<{ bucket: number; n: number; kev: number }>(sql`
    SELECT
      least(floor(epss_score * 10), 9)::int AS bucket,
      count(*)::int AS n,
      count(*) FILTER (WHERE is_kev)::int AS kev
    FROM cves
    WHERE epss_score IS NOT NULL
    GROUP BY 1
  `);
  const byBucket = new Map(rows.map((r) => [r.bucket, r]));
  const buckets: EpssBucket[] = [];
  for (let i = 0; i < 10; i++) {
    buckets.push({ lo: i / 10, hi: (i + 1) / 10, count: byBucket.get(i)?.n ?? 0 });
  }
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const kevCount = rows.reduce((sum, r) => sum + r.kev, 0);
  return { buckets, kevCount, total };
}

export interface VendorKev {
  vendor: string;
  total: number;
  ransomware: number;
}

/** Top KEV vendors by CVE count. */
export async function kevVendors(limit = 12): Promise<VendorKev[]> {
  const rows = await db.execute<{ vendor: string; total: number; ransomware: number }>(sql`
    SELECT
      vendor,
      count(*)::int AS total,
      count(*) FILTER (WHERE kev_ransomware)::int AS ransomware
    FROM cves
    WHERE is_kev AND vendor IS NOT NULL
    GROUP BY vendor
    ORDER BY total DESC, vendor ASC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({
    vendor: r.vendor,
    total: r.total,
    ransomware: r.ransomware,
  }));
}

export interface MalwareFamily {
  name: string;
  count: number;
  online: number;
}

/** C2 malware families seen in threat events, with online-server counts. */
export async function malwareFamilies(limit = 10): Promise<MalwareFamily[]> {
  const rows = await db.execute<{ name: string; count: number; online: number }>(sql`
    SELECT
      metadata->>'malware' AS name,
      count(*)::int AS count,
      count(*) FILTER (WHERE metadata->>'status' = 'online')::int AS online
    FROM threat_events
    WHERE type = 'c2_server' AND metadata->>'malware' IS NOT NULL
    GROUP BY 1
    ORDER BY count DESC, name ASC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({ name: r.name, count: r.count, online: r.online }));
}

export interface CountryTrend {
  country: string;
  total: number;
  /** 7 daily counts, oldest→newest. */
  byDay: number[];
}

/** Top countries by geolocated events over the last 7 days, with daily sparkline counts. */
export async function countryTrends(limit = 10): Promise<CountryTrend[]> {
  const days = lastDays(7);
  const startIso = `${days[0]}T00:00:00.000Z`;
  const rows = await db.execute<{ country: string; day: string; n: number }>(sql`
    SELECT
      country,
      to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
      count(*)::int AS n
    FROM threat_events
    WHERE country IS NOT NULL
      AND occurred_at >= ${startIso}::timestamptz
    GROUP BY 1, 2
  `);
  const byCountry = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const country = row.country.trim();
    const perDay = byCountry.get(country) ?? new Map<string, number>();
    perDay.set(row.day, (perDay.get(row.day) ?? 0) + row.n);
    byCountry.set(country, perDay);
  }
  const trends: CountryTrend[] = [...byCountry.entries()].map(([country, perDay]) => ({
    country,
    total: [...perDay.values()].reduce((sum, n) => sum + n, 0),
    byDay: days.map((day) => perDay.get(day) ?? 0),
  }));
  trends.sort((a, b) => b.total - a.total || a.country.localeCompare(b.country));
  return trends.slice(0, limit);
}

export interface SeverityDay {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/** Threat events per day by severity for the last 14 days (missing days zero-filled). */
export async function severityDaily(): Promise<SeverityDay[]> {
  const days = lastDays(14);
  const startIso = `${days[0]}T00:00:00.000Z`;
  const rows = await db.execute<{ day: string; severity: string; n: number }>(sql`
    SELECT
      to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
      severity,
      count(*)::int AS n
    FROM threat_events
    WHERE occurred_at >= ${startIso}::timestamptz
    GROUP BY 1, 2
  `);
  const byDay = new Map<string, SeverityDay>(
    days.map((date) => [date, { date, critical: 0, high: 0, medium: 0, low: 0 }]),
  );
  const severities = ["critical", "high", "medium", "low"] as const;
  for (const row of rows) {
    const day = byDay.get(row.day);
    if (!day) continue;
    const sev = severities.find((s) => s === row.severity);
    if (sev) day[sev] += row.n;
  }
  return [...byDay.values()];
}
