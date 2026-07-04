import { NextResponse } from "next/server";
import { severityDaily } from "@/lib/trends";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ days: await severityDaily() });
}
