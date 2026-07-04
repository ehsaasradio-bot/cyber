import { NextRequest, NextResponse } from "next/server";
import { topCves } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 15, 50);
  return NextResponse.json({ cves: await topCves(limit) });
}
