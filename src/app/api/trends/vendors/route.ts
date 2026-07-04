import { NextResponse } from "next/server";
import { kevVendors } from "@/lib/trends";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ vendors: await kevVendors() });
}
