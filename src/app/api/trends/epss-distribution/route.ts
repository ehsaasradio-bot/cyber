import { NextResponse } from "next/server";
import { epssDistribution } from "@/lib/trends";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await epssDistribution());
}
