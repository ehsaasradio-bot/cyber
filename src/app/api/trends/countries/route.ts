import { NextResponse } from "next/server";
import { countryTrends } from "@/lib/trends";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ countries: await countryTrends() });
}
