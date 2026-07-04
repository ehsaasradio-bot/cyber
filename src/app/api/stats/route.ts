import { NextResponse } from "next/server";
import { headlineStats } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await headlineStats());
}
