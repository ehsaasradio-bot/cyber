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

function entry(
  key: string,
  label: string,
  recent: number,
  prior: number,
  maxRecent: number,
  events14d: number,
  topCountry?: string | null,
): IndexEntry {
  const base = maxRecent > 0 ? (50 * Math.log1p(recent)) / Math.log1p(maxRecent) : 0;
  const momentum = Math.max(-1, Math.min(1, (recent - prior) / Math.max(prior, 1)));
  const score = Math.round(Math.max(0, Math.min(100, base + 25 + momentum * 25)));
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

export async function computeIndex(): Promise<CyberIndex> {
  const rows = await db.execute<{
    country: string | null;
    severity: string;
    recent: boolean;
    n: number;
  }>(sql`
    SELECT country, severity, occurred_at >= now() - interval '14 days' AS recent, count(*)::int AS n
    FROM threat_events
    WHERE occurred_at >= now() - interval '28 days'
    GROUP BY 1, 2, 3
  `);

  const regionAgg = new Map<
    string,
    { recent: number; prior: number; events: number; byCountry: Map<string, number> }
  >();
  let gRecent = 0;
  let gPrior = 0;
  let gEvents = 0;

  for (const r of rows) {
    const mass = (SEV_WEIGHT[r.severity] ?? 1) * r.n;
    if (r.recent) {
      gRecent += mass;
      gEvents += r.n;
    } else {
      gPrior += mass;
    }
    const region = countryRegion(r.country?.trim());
    if (!region) continue;
    const agg =
      regionAgg.get(region) ??
      { recent: 0, prior: 0, events: 0, byCountry: new Map<string, number>() };
    if (r.recent) {
      agg.recent += mass;
      agg.events += r.n;
      if (r.country) {
        agg.byCountry.set(
          r.country.trim(),
          (agg.byCountry.get(r.country.trim()) ?? 0) + r.n,
        );
      }
    } else {
      agg.prior += mass;
    }
    regionAgg.set(region, agg);
  }

  const maxRecent = Math.max(1, ...[...regionAgg.values()].map((a) => a.recent));
  const regions = Object.keys(REGION_LABELS).map((code) => {
    const agg = regionAgg.get(code) ?? {
      recent: 0,
      prior: 0,
      events: 0,
      byCountry: new Map<string, number>(),
    };
    const topCountry =
      [...agg.byCountry.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return entry(code, REGION_LABELS[code], agg.recent, agg.prior, maxRecent, agg.events, topCountry);
  });

  const sectorRows = await db.execute<{ sector: string; recent: boolean; n: number }>(sql`
    SELECT metadata->>'sector' AS sector, occurred_at >= now() - interval '14 days' AS recent, count(*)::int AS n
    FROM threat_events
    WHERE type = 'ransomware_victim' AND occurred_at >= now() - interval '28 days'
      AND metadata->>'sector' IS NOT NULL AND metadata->>'sector' != '' AND metadata->>'sector' != 'Not Found'
    GROUP BY 1, 2
  `);
  const sectorAgg = new Map<string, { recent: number; prior: number }>();
  for (const r of sectorRows) {
    const agg = sectorAgg.get(r.sector) ?? { recent: 0, prior: 0 };
    if (r.recent) agg.recent += r.n;
    else agg.prior += r.n;
    sectorAgg.set(r.sector, agg);
  }
  const maxSector = Math.max(1, ...[...sectorAgg.values()].map((a) => a.recent));
  const sectors = [...sectorAgg.entries()]
    .map(([name, a]) => entry(name, name, a.recent * 4, a.prior * 4, maxSector * 4, a.recent))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const global = entry(
    "global",
    "Global",
    gRecent,
    gPrior,
    Math.max(gRecent, 1),
    gEvents,
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
