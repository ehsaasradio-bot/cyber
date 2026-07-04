import { NextResponse } from "next/server";
import { ransomwareTrend } from "@/lib/trends";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await ransomwareTrend());
}
