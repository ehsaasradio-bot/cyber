import { NextResponse } from "next/server";
import { riskMatrix } from "@/lib/trends";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ cves: await riskMatrix() });
}
