import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const vendors = (req.nextUrl.searchParams.get("vendors") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 30);
  if (vendors.length === 0) {
    return NextResponse.json({ cves: [], patchNow: 0 });
  }

  const rows = await db.execute<{
    cveId: string;
    vendor: string;
    product: string | null;
    cvss: number | null;
    epss: number | null;
    isKev: boolean;
    ransomware: boolean;
    score: number;
    kevDate: string | null;
  }>(sql`
    SELECT cve_id AS "cveId", vendor, product,
           cvss_score::float8 AS cvss, epss_score::float8 AS epss,
           is_kev AS "isKev", kev_ransomware AS ransomware,
           priority_score::float8 AS score, kev_date_added::text AS "kevDate"
    FROM cves
    WHERE vendor IN (${sql.join(vendors.map((v) => sql`${v}`), sql`, `)})
    ORDER BY priority_score DESC
    LIMIT 25
  `);

  const patchNow = rows.filter((r) => r.isKev && (r.epss ?? 0) >= 0.3).length;
  return NextResponse.json({ cves: rows, patchNow });
}
