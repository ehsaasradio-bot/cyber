import { and, eq, isNull } from "drizzle-orm";
import { subDays } from "date-fns";
import { db } from "../../db";
import { cves, type NewCve, type NewThreatEvent } from "../../db/schema";
import { fetchWithTimeout, sleep, type Cursor, type FeedSource } from "../types";

const NVD_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const PAGE_SIZE = 2000;
/** KEV CVEs still missing CVSS get targeted lookups — bounded so a run never crawls. */
const MAX_TARGETED_LOOKUPS = 20;
const FIRST_RUN_WINDOW_DAYS = 7;

interface NvdVuln {
  cve: {
    id: string;
    published: string;
    lastModified: string;
    descriptions: { lang: string; value: string }[];
    metrics?: Record<
      string,
      { cvssData: { baseScore: number; baseSeverity?: string }; baseSeverity?: string }[]
    >;
  };
}

function apiDelayMs(): number {
  return process.env.NVD_API_KEY ? 1_000 : 7_000;
}

function headers(): Record<string, string> {
  return process.env.NVD_API_KEY ? { apiKey: process.env.NVD_API_KEY } : {};
}

async function nvdFetch(params: URLSearchParams): Promise<{
  vulnerabilities: NvdVuln[];
  totalResults: number;
}> {
  const url = `${NVD_URL}?${params}`;
  try {
    const res = await fetchWithTimeout(url, { headers: headers() }, 90_000);
    return await res.json();
  } catch {
    // NVD 403s/503s under load — one retry after a long backoff is usually enough
    await sleep(15_000);
    const res = await fetchWithTimeout(url, { headers: headers() }, 90_000);
    return await res.json();
  }
}

function extractCvss(v: NvdVuln): { score: number | null; severity: string | null } {
  const metrics = v.cve.metrics ?? {};
  for (const key of ["cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]) {
    const m = metrics[key]?.[0];
    if (m?.cvssData?.baseScore != null) {
      return {
        score: m.cvssData.baseScore,
        severity: (m.cvssData.baseSeverity ?? m.baseSeverity ?? null)?.toUpperCase() ?? null,
      };
    }
  }
  return { score: null, severity: null };
}

function toCveRow(v: NvdVuln): NewCve {
  const { score, severity } = extractCvss(v);
  const description = v.cve.descriptions.find((d) => d.lang === "en")?.value;
  return {
    cveId: v.cve.id,
    description,
    cvssScore: score != null ? String(score) : undefined,
    cvssSeverity: severity ?? undefined,
    publishedAt: new Date(v.cve.published),
    lastModified: new Date(v.cve.lastModified),
  };
}

export const nvdSource: FeedSource = {
  name: "nvd",
  async run(cursor: Cursor | null) {
    const start =
      typeof cursor?.lastModEnd === "string"
        ? new Date(cursor.lastModEnd)
        : subDays(new Date(), FIRST_RUN_WINDOW_DAYS);
    const end = new Date();

    const rows: NewCve[] = [];
    let fetched = 0;

    // 1) Incremental sweep of recently-modified CVEs
    let startIndex = 0;
    let total = Infinity;
    while (startIndex < total) {
      const params = new URLSearchParams({
        lastModStartDate: start.toISOString(),
        lastModEndDate: end.toISOString(),
        resultsPerPage: String(PAGE_SIZE),
        startIndex: String(startIndex),
      });
      const page = await nvdFetch(params);
      total = page.totalResults;
      fetched += page.vulnerabilities.length;
      rows.push(...page.vulnerabilities.map(toCveRow));
      startIndex += PAGE_SIZE;
      if (startIndex < total) await sleep(apiDelayMs());
    }

    // 2) Targeted enrichment: KEV CVEs we still have no CVSS for
    const missing = await db
      .select({ cveId: cves.cveId })
      .from(cves)
      .where(and(eq(cves.isKev, true), isNull(cves.cvssScore)))
      .limit(MAX_TARGETED_LOOKUPS);
    for (const { cveId } of missing) {
      await sleep(apiDelayMs());
      try {
        const page = await nvdFetch(new URLSearchParams({ cveId }));
        fetched += page.vulnerabilities.length;
        rows.push(...page.vulnerabilities.map(toCveRow));
      } catch {
        // individual lookups are retried on later runs; keep the sweep's progress
        break;
      }
    }

    // New critical CVEs published in this window become feed events
    const events: NewThreatEvent[] = rows
      .filter(
        (r) =>
          r.cvssScore != null &&
          Number(r.cvssScore) >= 9.0 &&
          r.publishedAt &&
          r.publishedAt >= start,
      )
      .map((r) => ({
        dedupKey: `nvd:critical:${r.cveId}`,
        type: "cve_critical",
        source: "nvd",
        title: `Critical CVE published — ${r.cveId} (CVSS ${r.cvssScore})`,
        description: r.description?.slice(0, 300),
        severity: "critical",
        occurredAt: r.publishedAt!,
        metadata: { cveId: r.cveId, cvss: Number(r.cvssScore) },
      }));

    return {
      itemsFetched: fetched,
      cves: rows,
      cveUpdateColumns: ["description", "cvssScore", "cvssSeverity", "publishedAt", "lastModified"],
      events,
      nextCursor: { lastModEnd: end.toISOString() },
    };
  },
};
