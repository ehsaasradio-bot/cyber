import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/** Time-machine feed: every geolocated event in the window, oldest first. */
export async function GET(req: NextRequest) {
  const days = Math.min(Number(req.nextUrl.searchParams.get("days")) || 30, 90);
  const rows = await db.execute<{
    ts: string;
    lat: number;
    lng: number;
    severity: string;
    type: string;
    source: string;
    title: string;
    country: string | null;
  }>(sql`
    SELECT occurred_at AS ts, lat::float8 AS lat, lon::float8 AS lng, severity, type, source, title, country
    FROM threat_events
    WHERE lat IS NOT NULL AND occurred_at >= now() - (${days} || ' days')::interval
    ORDER BY occurred_at ASC
    LIMIT 3000
  `);
  return NextResponse.json({
    events: rows.map((r) => ({ ...r, country: r.country?.trim() ?? null })),
    days,
  });
}
