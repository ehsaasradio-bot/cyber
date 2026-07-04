import type { NewCve, NewThreatEvent } from "../db/schema";

export type Cursor = Record<string, unknown>;

export interface SourceResult {
  itemsFetched: number;
  cves?: NewCve[];
  /** Columns this source owns — only these are overwritten on conflict. */
  cveUpdateColumns?: (keyof NewCve)[];
  /** Set existing description only if currently NULL (KEV yields to NVD's richer text). */
  cveDescriptionAsFallback?: boolean;
  events?: NewThreatEvent[];
  nextCursor?: Cursor;
}

export interface FeedSource {
  name: string;
  run(cursor: Cursor | null): Promise<SourceResult>;
}

export interface RunSummary {
  source: string;
  status: "success" | "error";
  itemsFetched: number;
  itemsUpserted: number;
  durationMs: number;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 60_000;

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "user-agent": "CyberWeather/0.1 (threat-visualization; local dev)",
      ...init.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`${url} -> HTTP ${res.status}`);
  }
  return res;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
