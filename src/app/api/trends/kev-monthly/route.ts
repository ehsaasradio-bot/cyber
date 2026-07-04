import { NextResponse } from "next/server";
import { kevMonthly } from "@/lib/trends";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ months: await kevMonthly() });
}
