import { formatDistanceToNowStrict } from "date-fns";

export function timeAgo(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true })
    .replace(" seconds", "s")
    .replace(" second", "s")
    .replace(" minutes", "m")
    .replace(" minute", "m")
    .replace(" hours", "h")
    .replace(" hour", "h")
    .replace(" days", "d")
    .replace(" day", "d");
}

export const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Compact USD: $9.8M, $940K, $500. */
export function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export const SOURCE_LABEL: Record<string, string> = {
  cisa_kev: "CISA KEV",
  nvd: "NVD",
  feodo: "Feodo",
  dshield: "DShield",
  urlhaus: "URLhaus",
  ransomware_live: "RansomLive",
  threatfox: "ThreatFox",
  hackernews: "The Hacker News",
  bleepingcomputer: "BleepingComputer",
  cisa_advisories: "CISA",
};
