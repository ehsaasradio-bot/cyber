import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { computeIndex } from "@/lib/indexEngine";

export const runtime = "nodejs";

let cache: { at: number; body: object } | null = null;
const TTL_MS = 6 * 60 * 60 * 1000;

interface Aggregates {
  idxGlobal: string;
  worstRegion: string;
  topSector: string;
  victims7d: number;
  topGroups: string;
  kev7d: number;
  topCve: string | null;
}

async function gather(): Promise<Aggregates> {
  const idx = await computeIndex();
  const worst = [...idx.regions].sort((a, b) => b.score - a.score)[0];
  const [counts] = await db.execute<{ victims: number; kev: number }>(sql`
    SELECT
      count(*) FILTER (WHERE type = 'ransomware_victim' AND occurred_at >= now() - interval '7 days')::int AS victims,
      count(*) FILTER (WHERE type = 'kev_added' AND occurred_at >= now() - interval '7 days')::int AS kev
    FROM threat_events
  `);
  const groups = await db.execute<{ grp: string; n: number }>(sql`
    SELECT metadata->>'group' AS grp, count(*)::int AS n FROM threat_events
    WHERE type = 'ransomware_victim' AND occurred_at >= now() - interval '7 days'
      AND metadata->>'group' IS NOT NULL
    GROUP BY 1 ORDER BY 2 DESC LIMIT 3
  `);
  const [cve] = await db.execute<{ id: string }>(sql`
    SELECT cve_id AS id FROM cves ORDER BY priority_score DESC LIMIT 1
  `);
  return {
    idxGlobal: `${idx.global.score} (${idx.global.level}, ${idx.global.outlook})`,
    worstRegion: worst ? `${worst.label} at ${worst.score} (${worst.level})` : "n/a",
    topSector: idx.sectors[0] ? `${idx.sectors[0].label}` : "n/a",
    victims7d: counts.victims,
    topGroups: groups.map((g) => `${g.grp} (${g.n})`).join(", ") || "none observed",
    kev7d: counts.kev,
    topCve: cve?.id ?? null,
  };
}

function autoBriefing(a: Aggregates): string {
  return (
    `Global cyber pressure stands at ${a.idxGlobal}. ` +
    `${a.worstRegion} is the most pressured region. ` +
    `Ransomware claimed ${a.victims7d} named victims in the last 7 days — most active: ${a.topGroups}; ` +
    `${a.topSector} is the hardest-hit sector. ` +
    `CISA added ${a.kev7d} newly exploited CVEs this week` +
    (a.topCve ? `; highest-priority vulnerability remains ${a.topCve}.` : ".") +
    ` Priority: patch KEV-listed products and monitor exposed remote-access services.`
  );
}

async function aiBriefing(a: Aggregates, key: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content:
            `You are the anchor of a cyber weather report. Write a 4-sentence executive briefing ` +
            `(confident weather-forecast tone, no bullet points, no preamble) from these facts:\n` +
            `Global index: ${a.idxGlobal}\nMost pressured region: ${a.worstRegion}\n` +
            `Ransomware victims last 7d: ${a.victims7d} (groups: ${a.topGroups})\n` +
            `Hardest-hit sector: ${a.topSector}\nNew KEV entries this week: ${a.kev7d}\n` +
            `Top-priority CVE: ${a.topCve}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.find((c) => c.type === "text")?.text?.trim();
  if (!text) throw new Error("empty completion");
  return text;
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.body);
  }
  const aggregates = await gather();
  let briefing = autoBriefing(aggregates);
  let source: "ai" | "auto" = "auto";
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      briefing = await aiBriefing(aggregates, key);
      source = "ai";
    } catch {
      // deterministic fallback already in place
    }
  }
  const body = { briefing, source, generatedAt: new Date().toISOString() };
  cache = { at: Date.now(), body };
  return NextResponse.json(body);
}
