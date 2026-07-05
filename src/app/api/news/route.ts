import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { threatEvents } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 20, 50);
  const industry = req.nextUrl.searchParams.get("industry");

  const conditions = [sql`${threatEvents.type} = 'breaking_news'`];
  if (industry) conditions.push(sql`${threatEvents.metadata}->>'industry' = ${industry}`);

  const rows = await db
    .select({
      id: threatEvents.id,
      title: threatEvents.title,
      severity: threatEvents.severity,
      source: threatEvents.source,
      occurredAt: threatEvents.occurredAt,
      metadata: threatEvents.metadata,
    })
    .from(threatEvents)
    .where(sql.join(conditions, sql` AND `))
    .orderBy(sql`${threatEvents.occurredAt} DESC`)
    .limit(limit);

  return NextResponse.json({ articles: rows });
}
