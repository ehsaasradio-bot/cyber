import { NextRequest, NextResponse } from "next/server";
import { ingest } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (req.headers.get("x-ingest-token") !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const source = req.nextUrl.searchParams.get("source") ?? "all";
  try {
    const summaries = await ingest(source.split(","));
    return NextResponse.json({ summaries });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
