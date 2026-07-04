import { runSource } from "./runner";
import { recomputePriorityScores } from "./score";
import type { FeedSource, RunSummary } from "./types";
import { kevSource } from "./sources/kev";

/** Registration order = execution order for "all" (CVE anchors before enrichment, geo last). */
const SOURCES: FeedSource[] = [kevSource];

export function availableSources(): string[] {
  return SOURCES.map((s) => s.name);
}

export function resolveSources(names: string[]): FeedSource[] {
  if (names.includes("all")) return SOURCES;
  const byName = new Map(SOURCES.map((s) => [s.name, s]));
  return names.map((n) => {
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
