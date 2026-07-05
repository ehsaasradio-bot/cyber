import type { NewThreatEvent } from "../../db/schema";
import { industryForText } from "../../industries";
import { fetchWithTimeout, type FeedSource } from "../types";
import { parseRss } from "../rss";

const FEEDS: { source: string; label: string; url: string }[] = [
  { source: "hackernews", label: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
  { source: "bleepingcomputer", label: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
  { source: "cisa_advisories", label: "CISA", url: "https://www.cisa.gov/cybersecurity-advisories/all.xml" },
];

const CRITICAL_RE = /\b(zero-day|0-day|ransomware|breach(ed)?|critical|exploited in the wild)\b/i;
const HIGH_RE = /\b(vulnerability|exploit|hack(ed)?|malware|attack|compromis(e|ed)|backdoor)\b/i;

function severityFor(text: string): string {
  if (CRITICAL_RE.test(text)) return "critical";
  if (HIGH_RE.test(text)) return "high";
  return "medium";
}

/** Stable id from the article link — RSS feeds have no numeric id we can trust across refetches. */
function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function parseDate(pubDate: string | null): Date {
  if (!pubDate) return new Date();
  const d = new Date(pubDate);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** Breaking security news from public RSS feeds — headlines only, links out to the source. */
export const newsSource: FeedSource = {
  name: "breaking_news",
  async run() {
    const events: NewThreatEvent[] = [];
    let fetched = 0;

    for (const feed of FEEDS) {
      try {
        const res = await fetchWithTimeout(feed.url, {}, 20_000);
        const xml = await res.text();
        const items = parseRss(xml, 30);
        fetched += items.length;
        for (const item of items) {
          const text = `${item.title} ${item.description ?? ""}`;
          events.push({
            dedupKey: `news:${feed.source}:${hash(item.link)}`,
            type: "breaking_news",
            source: feed.source,
            title: item.title,
            description: item.description?.slice(0, 300) ?? null,
            severity: severityFor(text),
            occurredAt: parseDate(item.pubDate),
            metadata: {
              link: item.link,
              feedLabel: feed.label,
              industry: industryForText(text),
            },
          });
        }
      } catch {
        // one feed failing shouldn't sink the others — runner.ts already isolates
        // per-source errors, but we isolate per-feed here too for partial credit
      }
    }

    return { itemsFetched: fetched, events };
  },
};
