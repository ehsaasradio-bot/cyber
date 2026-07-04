import { sql } from "drizzle-orm";
import { db } from "./db";
import { indexSnapshots } from "./db/schema";
import { countryRegion, REGION_LABELS } from "./regions";

/**
 * The CyberWeather Index: 0-100 risk pressure per region/sector plus a global
 * composite, built from severity-weighted event mass over the last 14 days
 * compared against the 14 days before that (momentum).
 */

const SEV_WEIGHT: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export interface IndexEntry {
  key: string;
  label: string;
  score: number;
  momentum: number; // -1..1 WoW-ish change
  outlook: "Improving" | "Stable" | "Deteriorating";
  level: "Low" | "Guarded" | "Elevated" | "Severe";
  events14d: number;
  topCountry?: string | null;
  delta?: number | null; // vs yesterday's snapshot
}

export interface CyberIndex {
  global: IndexEntry;
  regions: IndexEntry[];
  sectors: IndexEntry[];
  generatedAt: string;
}

function level(score: number): IndexEntry["level"] {
  if (score >= 75) return "Severe";
  if (score >= 55) return "Elevated";
  if (score >= 35) return "Guarded";
  return "Low";
}

function outlook(momentum: number): IndexEntry["outlook"] {
  if (momentum > 0.2) return "Deteriorating";
  if (momentum < -0.2) return "Improving";
  return "Stable";
}

/**
 * Score = 50 at each scope's own steady state (recent 14d mass ≈ its 90-day
 * baseline), rising toward 100 as activity doubles/triples and falling as it
 * quiets. Self-calibrating: backfilled history becomes the baseline instead of
 * inflating the score.
 */
function entry(
  key: string,
  label: string,
  recent: number,
  prior: number,
  baseline14: number,
  events14d: number,
  topCountry?: string | null,
): IndexEntry {
  const ratio = recent / Math.max(baseline14, 1);
  const base = 50 * Math.sqrt(ratio); // 1x baseline → 50, 2x → ~71, 4x → 100
  const momentum = Math.max(-1, Math.min(1, (recent - prior) / Math.max(prior, 1)));
  const score = Math.round(Math.max(0, Math.min(100, base + momentum * 10)));
  return {
    key,
    label,
    score,
    momentum: Math.round(momentum * 100) / 100,
    outlook: outlook(momentum),
    level: level(score),
    events14d,
    topCountry,
  };
}

interface Agg {
  recent: number; // severity mass, last 14d
  prior: number; // severity mass, 14-28d ago
  total90: number; // severity mass, full 90d window
  span90: number; // days of history actually present (≥1)
  events: number;
  byCountry: Map<string, number>;
}

function newAgg(): Agg {
  return { recent: 0, prior: 0, total90: 0, span90: 1, events: 0, byCountry: new Map() };
}

/** Expected 14-day mass given this scope's own 90-day history. */
function baseline14(a: Agg): number {
  return (a.total90 / Math.max(a.span90, 14)) * 14;
}

export async function computeIndex(): Promise<CyberIndex> {
  const rows = await db.execute<{
    country: string | null;
    severity: string;
    bucket: string; // recent | prior | old
    age_days: number;
    n: number;
  }>(sql`
    SELECT country, severity,
      CASE
        WHEN occurred_at >= now() - interval '14 days' THEN 'recent'
        WHEN occurred_at >= now() - interval '28 days' THEN 'prior'
        ELSE 'old'
      END AS bucket,
      floor(extract(epoch FROM now() - min(occurred_at)) / 86400)::int AS age_days,
      count(*)::int AS n
    FROM threat_events
    WHERE occurred_at >= now() - interval '90 days'
    GROUP BY 1, 2, 3
  `);

  const regionAgg = new Map<string, Agg>();
  const globalAgg = newAgg();

  const feed = (agg: Agg, r: (typeof rows)[number], mass: number) => {
    agg.total90 += mass;
    agg.span90 = Math.max(agg.span90, Math.min(r.age_days, 90));
    if (r.bucket === "recent") {
      agg.recent += mass;
      agg.events += r.n;
      if (r.country) {
        const cc = r.country.trim();
        agg.byCountry.set(cc, (agg.byCountry.get(cc) ?? 0) + r.n);
      }
    } else if (r.bucket === "prior") {
      agg.prior += mass;
    }
  };

  for (const r of rows) {
    const mass = (SEV_WEIGHT[r.severity] ?? 1) * r.n;
    feed(globalAgg, r, mass);
    const region = countryRegion(r.country?.trim());
    if (!region) continue;
    const agg = regionAgg.get(region) ?? newAgg();
    feed(agg, r, mass);
    regionAgg.set(region, agg);
  }

  const regions = Object.keys(REGION_LABELS).map((code) => {
    const agg = regionAgg.get(code) ?? newAgg();
    const topCountry =
      [...agg.byCountry.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return entry(
      code,
      REGION_LABELS[code],
      agg.recent,
      agg.prior,
      baseline14(agg),
      agg.events,
      topCountry,
    );
  });

  const sectorRows = await db.execute<{ sector: string; bucket: string; age_days: number; n: number }>(sql`
    SELECT metadata->>'sector' AS sector,
      CASE
        WHEN occurred_at >= now() - interval '14 days' THEN 'recent'
        WHEN occurred_at >= now() - interval '28 days' THEN 'prior'
        ELSE 'old'
      END AS bucket,
      floor(extract(epoch FROM now() - min(occurred_at)) / 86400)::int AS age_days,
      count(*)::int AS n
    FROM threat_events
    WHERE type = 'ransomware_victim' AND occurred_at >= now() - interval '90 days'
      AND metadata->>'sector' IS NOT NULL AND metadata->>'sector' != '' AND metadata->>'sector' != 'Not Found'
    GROUP BY 1, 2
  `);
  const sectorAgg = new Map<string, Agg>();
  for (const r of sectorRows) {
    const agg = sectorAgg.get(r.sector) ?? newAgg();
    feed(agg, { ...r, country: null, severity: "high" }, r.n);
    sectorAgg.set(r.sector, agg);
  }
  const sectors = [...sectorAgg.entries()]
    .map(([name, a]) => entry(name, name, a.recent, a.prior, baseline14(a), a.events))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const global = entry(
    "global",
    "Global",
    globalAgg.recent,
    globalAgg.prior,
    baseline14(globalAgg),
    globalAgg.events,
    null,
  );

  return { global, regions, sectors, generatedAt: new Date().toISOString() };
}

/** Attach score deltas vs the most recent prior snapshot day. */
export async function withDeltas(idx: CyberIndex): Promise<CyberIndex> {
  const prev = await db.execute<{ scope: string; key: string; score: number }>(sql`
    SELECT DISTINCT ON (scope, key) scope, key, score::float8 AS score
    FROM index_snapshots
    WHERE snapped_at < current_date
    ORDER BY scope, key, snapped_at DESC
  `);
  const map = new Map(prev.map((p) => [`${p.scope}:${p.key}`, p.score]));
  const apply = (scope: string, e: IndexEntry) => {
    const old = map.get(`${scope}:${e.key}`);
    e.delta = old != null ? Math.round(e.score - old) : null;
  };
  apply("global", idx.global);
  idx.regions.forEach((r) => apply("region", r));
  idx.sectors.forEach((s) => apply("sector", s));
  return idx;
}

/** Persist today's snapshot — called at the end of every ingest run. */
export async function snapshotIndex(): Promise<void> {
  const idx = await computeIndex();
  const today = new Date().toISOString().slice(0, 10);
  const rows = [
    { snappedAt: today, scope: "global", key: "global", score: String(idx.global.score) },
    ...idx.regions.map((r) => ({
      snappedAt: today,
      scope: "region",
      key: r.key,
      score: String(r.score),
    })),
    ...idx.sectors.map((s) => ({
      snappedAt: today,
      scope: "sector",
      key: s.key,
      score: String(s.score),
    })),
  ];
  await db
    .insert(indexSnapshots)
    .values(rows)
    .onConflictDoUpdate({
      target: [indexSnapshots.snappedAt, indexSnapshots.scope, indexSnapshots.key],
      set: { score: sql`excluded.score` },
    });
}
