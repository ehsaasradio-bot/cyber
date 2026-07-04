import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Proxy to Shodan InternetDB (free, keyless): open ports, known vulns, and tags
 * for an IP. Cached in-process for 24h — the upstream refreshes weekly.
 */
const cache = new Map<string, { at: number; body: object }>();
const TTL_MS = 24 * 60 * 60 * 1000;
const IP_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ip: string }> },
) {
  const { ip } = await params;
  if (!IP_RE.test(ip)) {
    return NextResponse.json({ error: "invalid ip" }, { status: 400 });
  }

  const hit = cache.get(ip);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json(hit.body);
  }

  try {
    const res = await fetch(`https://internetdb.shodan.io/${ip}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) {
      const body = { found: false };
      cache.set(ip, { at: Date.now(), body });
      return NextResponse.json(body);
    }
    if (!res.ok) throw new Error(`internetdb HTTP ${res.status}`);
    const data = await res.json();
    const body = {
      found: true,
      ports: data.ports ?? [],
      vulns: data.vulns ?? [],
      tags: data.tags ?? [],
      hostnames: data.hostnames ?? [],
      cpes: (data.cpes ?? []).slice(0, 6),
    };
    cache.set(ip, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ found: false, error: "lookup failed" }, { status: 502 });
  }
}
