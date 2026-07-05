import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const MAX_TERMS = 15;
const MIN_LEN = 2;
const MAX_LEN = 40;

/** Escape ILIKE wildcards so a literal "%" or "_" in a term behaves as text, not a wildcard. */
function likeSafe(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

interface TermResult {
  term: string;
  cveHits: { cveId: string; vendor: string | null; product: string | null; priorityScore: number }[];
  newsHits: { id: number; title: string; occurredAt: string; link: string | null }[];
  eventHits: { id: number; title: string; type: string; occurredAt: string }[];
  total: number;
}

export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get("terms") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length >= MIN_LEN && t.length <= MAX_LEN)
    .slice(0, MAX_TERMS);

  if (raw.length === 0) return NextResponse.json({ results: [] });

  const results: TermResult[] = [];
  for (const term of raw) {
    const pattern = likeSafe(term);

    const cveRows = await db.execute<{
      cveId: string;
      vendor: string | null;
      product: string | null;
      priorityScore: number;
    }>(sql`
      SELECT cve_id AS "cveId", vendor, product, priority_score::float8 AS "priorityScore"
      FROM cves
      WHERE vendor ILIKE ${pattern} OR product ILIKE ${pattern} OR description ILIKE ${pattern}
      ORDER BY priority_score DESC LIMIT 5
    `);

    const newsRows = await db.execute<{
      id: number;
      title: string;
      occurredAt: string;
      link: string | null;
    }>(sql`
      SELECT id, title, occurred_at AS "occurredAt", metadata->>'link' AS link
      FROM threat_events
      WHERE type = 'breaking_news' AND (title ILIKE ${pattern} OR description ILIKE ${pattern})
      ORDER BY occurred_at DESC LIMIT 5
    `);

    const eventRows = await db.execute<{
      id: number;
      title: string;
      type: string;
      occurredAt: string;
    }>(sql`
      SELECT id, title, type, occurred_at AS "occurredAt"
      FROM threat_events
      WHERE type != 'breaking_news' AND title ILIKE ${pattern}
      ORDER BY occurred_at DESC LIMIT 5
    `);

    results.push({
      term,
      cveHits: [...cveRows],
      newsHits: [...newsRows],
      eventHits: [...eventRows],
      total: cveRows.length + newsRows.length + eventRows.length,
    });
  }

  return NextResponse.json({ results });
}
