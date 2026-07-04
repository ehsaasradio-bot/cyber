import { NextResponse } from "next/server";
import { computeIndex, withDeltas } from "@/lib/indexEngine";

export const runtime = "nodejs";

let cache: { at: number; body: object } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.body);
  }
  const idx = await withDeltas(await computeIndex());
  cache = { at: Date.now(), body: idx };
  return NextResponse.json(idx);
}
