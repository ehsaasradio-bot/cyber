"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher, slugify } from "@/lib/format";
import { loadProfile, type Profile } from "@/lib/profile";
import { URGENCY_STYLE, type Urgency } from "@/lib/decisions";
import { ExecCta, ExecHeader, ExecKpi, ExecNavLink } from "./ExecutiveBits";
import GlassPanel from "./GlassPanel";

interface Action {
  cveId: string;
  vendor: string;
  product: string | null;
  urgency: Urgency;
  window: string;
  verb: string;
  rationale: string;
  score: number;
}
interface ExecData {
  sectorPressure: { score: number; level: string; outlook: string; label: string } | null;
  exposure: {
    tracked: number;
    kev: number;
    ransomware: number;
    critical: number;
    patchNow: number;
    meanEpssPct: number;
    topActions: Action[];
    byVendor: { vendor: string; count: number; kev: number; maxScore: number }[];
  };
  sectorThreat: { victims90d: number; groups: { name: string; victims: number }[] } | null;
}

const LEVEL_TONE: Record<string, string> = {
  Severe: "text-sev-critical",
  Elevated: "text-sev-high",
  Guarded: "text-sev-medium",
  Low: "text-sev-low",
};

export default function CisoDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => setProfile(loadProfile()), []);

  const params = profile
    ? new URLSearchParams({ vendors: profile.vendors.join(","), sector: profile.sector ?? "" }).toString()
    : null;
  const { data } = useSWR<ExecData>(profile ? `/api/executive?${params}` : null, fetcher, {
    refreshInterval: 300_000,
    keepPreviousData: true,
  });

  if (!profile) return null;
  const hasStack = profile.vendors.length > 0;
  const x = data?.exposure;
  const maxVendorKev = Math.max(1, ...(x?.byVendor.map((v) => v.kev) ?? [1]));

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16">
      <ExecHeader chip="CISO View">
        <ExecNavLink href="/ceo">Board View</ExecNavLink>
        <ExecNavLink href="/cyberthreatintel" accent="pulse">
          ⚡ Actions
        </ExecNavLink>
        <ExecNavLink href="/attack-techniques">ATT&amp;CK</ExecNavLink>
        <ExecNavLink href="/my" accent="pulse">
          Edit stack
        </ExecNavLink>
      </ExecHeader>

      {!hasStack ? (
        <ExecCta role="CISO" />
      ) : !data || !x ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-2xl bg-white/[0.05]" />
          <div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />
        </div>
      ) : (
        <>
          {/* Posture hero */}
          <section className="animate-panel-in rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_30px_-10px] shadow-cyan-500/20 backdrop-blur-xl [animation-delay:80ms]">
            <p className="font-mono text-[10px] uppercase tracking-widest text-pulse">
              Security posture · your stack
            </p>
            <p className="mt-2 text-[15px] font-medium leading-relaxed text-slate-100">
              {x.patchNow > 0 ? (
                <>
                  <span className="text-sev-critical">{x.patchNow}</span> vulnerabilit
                  {x.patchNow === 1 ? "y" : "ies"} need patching now — actively exploited and in your
                  stack.
                </>
              ) : (
                <>No actively-exploited vulnerabilities outstanding in your stack right now.</>
              )}
            </p>
            <p className="mt-1 font-mono text-[11px] text-slate-500">
              {x.kev} known-exploited · {x.critical} critical (CVSS ≥ 9) · {x.meanEpssPct}% mean
              exploit probability across {x.tracked} tracked CVEs
            </p>
          </section>

          {/* Posture KPIs */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ExecKpi label="Patch-now backlog" value={String(x.patchNow)} sub="KEV + high EPSS" tone="text-sev-critical" />
            <ExecKpi label="KEV exposure" value={String(x.kev)} sub="known exploited" tone="text-sev-high" />
            <ExecKpi label="Critical CVEs" value={String(x.critical)} sub="CVSS ≥ 9" tone="text-sev-high" delay={160} />
            <ExecKpi label="Mean exploit prob" value={`${x.meanEpssPct}%`} sub="EPSS across stack" tone="text-sev-medium" delay={200} />
          </div>

          {/* Remediation queue */}
          <div className="mt-4 px-2 pb-1">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
              Remediation Queue
            </h2>
          </div>
          <div className="space-y-2.5">
            {x.topActions.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center font-mono text-xs uppercase tracking-widest text-slate-500">
                No tracked CVEs for your stack
              </div>
            ) : (
              x.topActions.map((d, i) => {
                const s = URGENCY_STYLE[d.urgency];
                return (
                  <Link
                    key={d.cveId}
                    href={`/cve/${d.cveId}`}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className={`group flex animate-panel-in items-center gap-4 rounded-xl border ${s.border} ${s.bg} px-4 py-3 transition-colors hover:bg-white/[0.06]`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded border px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-wider ${s.text} ${s.border}`}>
                          {d.urgency} · {d.window}
                        </span>
                        <span className="font-mono text-[11px] text-neon">{d.cveId}</span>
                      </div>
                      <p className="mt-1 text-[14px] font-medium text-slate-100">
                        {d.verb} {d.vendor}
                        {d.product ? ` ${d.product}` : ""}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">{d.rationale}</p>
                    </div>
                    <span className={`shrink-0 font-mono text-xl font-bold ${s.text}`}>
                      {d.score}
                    </span>
                  </Link>
                );
              })
            )}
          </div>

          {/* Exposure by vendor + threat landscape */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GlassPanel title="Exposure by Vendor">
              <div className="flex flex-col gap-1 p-4">
                {x.byVendor.map((v) => (
                  <div key={v.vendor} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate font-mono text-[12px] text-slate-300">
                      {v.vendor}
                    </span>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sev-critical/80 to-sev-high/80"
                        style={{ width: `${(v.kev / maxVendorKev) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right font-mono text-[11px] text-slate-400">
                      {v.kev} KEV
                    </span>
                  </div>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel title="Sector Threat Landscape">
              {data.sectorThreat ? (
                <div className="p-4">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-2xl font-semibold text-sev-critical">
                      {data.sectorThreat.victims90d}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      ransomware victims · 90d
                    </span>
                    {data.sectorPressure && (
                      <span className={`ml-auto font-mono text-[11px] ${LEVEL_TONE[data.sectorPressure.level] ?? "text-slate-400"}`}>
                        pressure {data.sectorPressure.score} · {data.sectorPressure.level}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-slate-500">
                    Groups targeting your sector
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {data.sectorThreat.groups.map((g) => (
                      <Link
                        key={g.name}
                        href={`/group/${slugify(g.name)}`}
                        className="rounded border border-sev-critical/30 bg-sev-critical/[0.08] px-2 py-0.5 font-mono text-[10px] text-slate-300 transition-colors hover:bg-sev-critical/[0.18]"
                      >
                        {g.name} <span className="text-sev-critical">{g.victims}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center p-6 text-center font-mono text-xs uppercase tracking-widest text-slate-500">
                  Pick a sector in My Weather<br />for the threat landscape
                </div>
              )}
            </GlassPanel>
          </div>

          <p className="mt-6 px-2 font-mono text-[10px] uppercase tracking-wider text-slate-600">
            For the board-level dollar view, see the{" "}
            <a href="/ceo" className="text-neon hover:underline">
              CEO view
            </a>
          </p>
        </>
      )}
    </main>
  );
}
