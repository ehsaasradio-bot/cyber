import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const rows = await db.execute<{ vendor: string; n: number }>(sql`
    SELECT vendor, count(*)::int AS n
    FROM cves
    WHERE is_kev AND vendor IS NOT NULL
    GROUP BY 1 ORDER BY 2 DESC LIMIT 48
  `);
  return NextResponse.json({ vendors: rows.map((r) => ({ name: r.vendor, kevCount: r.n })) });
}
