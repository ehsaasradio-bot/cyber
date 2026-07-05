import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { EVENT_TYPE_TECHNIQUES } from "@/lib/mitreAttack";

export const runtime = "nodejs";

/** How many recent (30d) events belong to each event type, so the matrix can show live weight per technique. */
export async function GET() {
  const rows = await db.execute<{ type: string; n: number }>(sql`
    SELECT type, count(*)::int AS n
    FROM threat_events
    WHERE occurred_at >= now() - interval '30 days'
    GROUP BY 1
  `);
  const byType = Object.fromEntries(rows.map((r) => [r.type, r.n]));

  const techniqueCounts: Record<string, number> = {};
  for (const [type, ids] of Object.entries(EVENT_TYPE_TECHNIQUES)) {
    const n = byType[type] ?? 0;
    for (const id of ids) techniqueCounts[id] = (techniqueCounts[id] ?? 0) + n;
  }

  return NextResponse.json({ counts: techniqueCounts });
}
