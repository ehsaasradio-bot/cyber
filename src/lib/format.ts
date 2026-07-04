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

export const SOURCE_LABEL: Record<string, string> = {
  cisa_kev: "CISA KEV",
  nvd: "NVD",
  feodo: "Feodo",
  dshield: "DShield",
  urlhaus: "URLhaus",
  ransomware_live: "RansomLive",
};
