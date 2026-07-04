"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/format";

interface TopCve {
  cveId: string;
  description: string | null;
  cvssScore: string | null;
  epssScore: string | null;
  isKev: boolean;
  kevRansomware: boolean;
  vendor: string | null;
  product: string | null;
  priorityScore: string;
}

export default function TopCves() {
  const { data, isLoading } = useSWR<{ cves: TopCve[] }>(
    "/api/cves/top?limit=15",
    fetcher,
    { refreshInterval: 300_000, keepPreviousData: true },
  );

  if (isLoading && !data) return <CveSkeleton />;
  if (!data?.cves.length) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center font-mono text-xs uppercase leading-relaxed tracking-widest text-slate-500">
        Awaiting signal —<br />
        run `npm run ingest`
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/[0.04]">
      {data.cves.map((c, rank) => {
        const score = Number(c.priorityScore);
        return (
          <li
            key={c.cveId}
            onClick={() =>
              window.open(`https://nvd.nist.gov/vuln/detail/${c.cveId}`, "_blank", "noopener")
            }
            title="Open in NVD"
            className="group cursor-pointer px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 shrink-0 font-mono text-[10px] text-slate-600">
                {String(rank + 1).padStart(2, "0")}
              </span>
              <span className="font-mono text-[13px] font-medium text-neon">
                {c.cveId}
                <span className="ml-1 inline-block opacity-0 transition-opacity group-hover:opacity-100">
                  ↗
                </span>
              </span>
              <span className="ml-auto font-mono text-[13px] font-semibold text-slate-100">
                {score.toFixed(1)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 pl-7 font-mono text-[10px]">
              {c.cvssScore && (
                <span className="rounded bg-white/[0.06] px-1.5 py-px text-slate-300">
                  CVSS {c.cvssScore}
                </span>
              )}
              {c.epssScore && (
                <span className="rounded bg-white/[0.06] px-1.5 py-px text-slate-300">
                  EPSS {(Number(c.epssScore) * 100).toFixed(0)}%
                </span>
              )}
              {c.isKev && (
                <span className="rounded border border-sev-high/40 bg-sev-high/10 px-1.5 py-px uppercase text-sev-high">
                  KEV
                </span>
              )}
              {c.kevRansomware && (
                <span className="rounded border border-sev-critical/40 bg-sev-critical/10 px-1.5 py-px uppercase text-sev-critical">
                  Ransomware
                </span>
              )}
            </div>
            <div className="mt-1 pl-7">
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-neon to-pulse"
                  style={{ width: `${Math.min(score, 100)}%` }}
                />
              </div>
              {(c.vendor || c.product) && (
                <p className="mt-1 truncate text-[11px] text-slate-500">
                  {[c.vendor, c.product].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CveSkeleton() {
  return (
    <div className="space-y-4 p-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-2">
          <div className="h-3.5 w-3/4 rounded bg-white/[0.06]" />
          <div className="h-1.5 w-full rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}
