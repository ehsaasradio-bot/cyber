import { NextRequest, NextResponse } from "next/server";
import { recentEvents } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 50, 200);

  const events = await recentEvents(
    since && !isNaN(since.getTime()) ? since : null,
    limit,
  );
  const latest = events[0]?.ingestedAt?.toISOString() ?? sinceParam ?? null;

  return NextResponse.json({ events, latest });
}
