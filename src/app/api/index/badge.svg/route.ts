import { NextResponse } from "next/server";
import { computeIndex } from "@/lib/indexEngine";

export const runtime = "nodejs";

const LEVEL_COLOR: Record<string, string> = {
  Low: "#38bdf8",
  Guarded: "#facc15",
  Elevated: "#fb923c",
  Severe: "#f43f5e",
};

/** Embeddable status badge: <img src=".../api/index/badge.svg"> */
export async function GET() {
  const idx = await computeIndex();
  const { score, level } = idx.global;
  const color = LEVEL_COLOR[level] ?? "#38bdf8";
  const label = "CYBERWEATHER";
  const value = `${score} · ${level.toUpperCase()}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="28" role="img" aria-label="${label}: ${value}">
  <rect width="210" height="28" rx="6" fill="#05070f"/>
  <rect x="112" y="3" width="95" height="22" rx="4" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-opacity="0.5"/>
  <text x="12" y="18.5" font-family="ui-monospace,Menlo,monospace" font-size="11" letter-spacing="2" fill="#e2e8f0">${label}</text>
  <text x="159" y="18.5" font-family="ui-monospace,Menlo,monospace" font-size="11" font-weight="bold" fill="${color}" text-anchor="middle">${value}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=3600",
    },
  });
}
