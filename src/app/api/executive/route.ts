import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { computeIndex } from "@/lib/indexEngine";
import { decide, URGENCY_ORDER } from "@/lib/decisions";
import { industryForSector, industryLabel } from "@/lib/industries";
import { financialRisk, frameworksFor, BREACH_COST_SOURCE } from "@/lib/executive";

export const runtime = "nodejs";

// computeIndex is a little heavy and both dashboards hit this route — share a
// short cache so a CEO+CISO page load recomputes it at most once.
let idxCache: { at: number; value: Awaited<ReturnType<typeof computeIndex>> } | null = null;
async function cachedIndex() {
  if (idxCache && Date.now() - idxCache.at < 5 * 60 * 1000) return idxCache.value;
  const value = await computeIndex();
  idxCache = { at: Date.now(), value };
  return value;
}

type CveRow = {
  cveId: string;
  vendor: string;
  product: string | null;
  cvss: number | null;
  epss: number | null;
  isKev: boolean;
  ransomware: boolean;
  score: number;
};

export async function GET(req: NextRequest) {
  const vendors = (req.nextUrl.searchParams.get("vendors") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 30);
  const sectorName = req.nextUrl.searchParams.get("sector")?.trim() || null;
  const industrySlug = industryForSector(sectorName);

  const idx = await cachedIndex();
  const sectorEntry = sectorName ? idx.sectors.find((s) => s.key === sectorName) : null;

  let cves: CveRow[] = [];
  if (vendors.length) {
    cves = await db.execute<CveRow>(sql`
      SELECT cve_id AS "cveId", vendor, product,
             cvss_score::float8 AS cvss, epss_score::float8 AS epss,
             is_kev AS "isKev", kev_ransomware AS ransomware,
             priority_score::float8 AS score
      FROM cves
      WHERE vendor IN (${sql.join(vendors.map((v) => sql`${v}`), sql`, `)})
      ORDER BY priority_score DESC
      LIMIT 40
    `);
  }

  const kev = cves.filter((c) => c.isKev);
  const ransomware = cves.filter((c) => c.ransomware);
  const critical = cves.filter((c) => (c.cvss ?? 0) >= 9);
  const patchNow = cves.filter((c) => c.isKev && (c.epss ?? 0) >= 0.3);
  const meanEpss = cves.length
    ? cves.reduce((s, c) => s + (c.epss ?? 0), 0) / cves.length
    : 0;

  const topActions = cves
    .map(decide)
    .sort(
      (a, b) =>
        URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency) || b.score - a.score,
    )
    .slice(0, 6)
    .map((d) => ({
      cveId: d.cveId,
      vendor: d.vendor,
      product: d.product,
      urgency: d.urgency,
      window: d.window,
      verb: d.verb,
      rationale: d.rationale,
      score: Math.round(d.score),
    }));

  // per-vendor exposure breakdown (CISO coverage view)
  const byVendorMap = new Map<string, { vendor: string; count: number; kev: number; maxScore: number }>();
  for (const c of cves) {
    const v = byVendorMap.get(c.vendor) ?? { vendor: c.vendor, count: 0, kev: 0, maxScore: 0 };
    v.count += 1;
    if (c.isKev) v.kev += 1;
    v.maxScore = Math.max(v.maxScore, c.score);
    byVendorMap.set(c.vendor, v);
  }
  const byVendor = [...byVendorMap.values()].sort((a, b) => b.kev - a.kev || b.maxScore - a.maxScore);

  const financial = financialRisk(
    industrySlug,
    sectorEntry?.score ?? null,
    idx.global.score,
    kev.length,
  );

  const frameworks = frameworksFor(industrySlug).map((f) => ({
    ...f,
    exposure: kev.length > 0 ? ("at-risk" as const) : ("aligned" as const),
  }));

  // sector threat landscape (last 90 days of ransomware victims in the sector)
  let sectorThreat: { victims90d: number; groups: { name: string; victims: number }[] } | null =
    null;
  if (sectorName) {
    const groups = await db.execute<{ grp: string; n: number }>(sql`
      SELECT metadata->>'group' AS grp, count(*)::int AS n
      FROM threat_events
      WHERE type = 'ransomware_victim' AND metadata->>'sector' = ${sectorName}
        AND metadata->>'group' IS NOT NULL AND occurred_at >= now() - interval '90 days'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 5
    `);
    const [tot] = await db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM threat_events
      WHERE type = 'ransomware_victim' AND metadata->>'sector' = ${sectorName}
        AND occurred_at >= now() - interval '90 days'
    `);
    sectorThreat = {
      victims90d: tot?.n ?? 0,
      groups: groups.map((g) => ({ name: g.grp, victims: g.n })),
    };
  }

  return NextResponse.json({
    industry: industrySlug ? { slug: industrySlug, label: industryLabel(industrySlug) } : null,
    sector: sectorName,
    global: idx.global,
    sectorPressure: sectorEntry
      ? {
          score: sectorEntry.score,
          level: sectorEntry.level,
          outlook: sectorEntry.outlook,
          label: sectorEntry.label,
        }
      : null,
    exposure: {
      tracked: cves.length,
      kev: kev.length,
      ransomware: ransomware.length,
      critical: critical.length,
      patchNow: patchNow.length,
      meanEpssPct: Math.round(meanEpss * 100),
      topActions,
      byVendor,
    },
    financial,
    compliance: { frameworks, openKev: kev.length },
    sectorThreat,
    benchmarkSource: BREACH_COST_SOURCE,
  });
}
