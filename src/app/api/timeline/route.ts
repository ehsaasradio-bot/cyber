import { NextRequest, NextResponse } from "next/server";
import { timeline, type Window } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const window = (req.nextUrl.searchParams.get("window") === "7d" ? "7d" : "24h") as Window;
  return NextResponse.json({ buckets: await timeline(window) });
}
