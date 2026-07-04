import { runSource } from "./runner";
import { recomputePriorityScores } from "./score";
import type { FeedSource, RunSummary } from "./types";
import { kevSource } from "./sources/kev";
import { nvdSource } from "./sources/nvd";
import { epssSource } from "./sources/epss";
import { feodoSource } from "./sources/feodo";
import { dshieldSource } from "./sources/dshield";
import { urlhausSource } from "./sources/urlhaus";
import { ransomwareSource } from "./sources/ransomware";

/** Registration order = execution order for "all" (CVE anchors before enrichment, geo last). */
const SOURCES: FeedSource[] = [
  kevSource,
  nvdSource,
  epssSource,
  feodoSource,
  dshieldSource,
  urlhausSource,
  ransomwareSource,
];

/** Sources cheap enough to refresh every 15 min (no NVD/EPSS crawl). */
export const FAST_SOURCES = ["cisa_kev", "feodo", "dshield", "urlhaus", "ransomware_live"];
/** Rate-limited enrichment sources — hourly is plenty. */
export const SLOW_SOURCES = ["nvd", "epss"];

export function availableSources(): string[] {
  return SOURCES.map((s) => s.name);
}

export function resolveSources(names: string[]): FeedSource[] {
  if (names.includes("all")) return SOURCES;
  const expanded = names.flatMap((n) =>
    n === "fast" ? FAST_SOURCES : n === "slow" ? SLOW_SOURCES : [n],
  );
  const byName = new Map(SOURCES.map((s) => [s.name, s]));
  return expanded.map((n) => {
    const s = byName.get(n);
    if (!s) throw new Error(`Unknown source "${n}". Available: all, ${availableSources().join(", ")}`);
    return s;
  });
}

export async function ingest(names: string[]): Promise<RunSummary[]> {
  const sources = resolveSources(names);
  const summaries: RunSummary[] = [];
  for (const source of sources) {
    summaries.push(await runSource(source));
  }
  await recomputePriorityScores();
  return summaries;
}
