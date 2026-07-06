import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (req.headers.get("x-ingest-token") !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const source = req.nextUrl.searchParams.get("source") ?? "all";
  try {
    // Lazy import: @/lib/ingest pulls in geoip-lite (binary .dat files, no
    // filesystem on Workers). Loading it here keeps it out of the edge bundle.
    const { ingest } = await import("@/lib/ingest");
    const summaries = await ingest(source.split(","));
    return NextResponse.json({ summaries });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
