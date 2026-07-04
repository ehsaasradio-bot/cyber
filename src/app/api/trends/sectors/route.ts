import { NextResponse } from "next/server";
import { listSectors } from "@/lib/detail";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ sectors: await listSectors() });
}
