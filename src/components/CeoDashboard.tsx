"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher, fmtUsd } from "@/lib/format";
import { loadProfile, type Profile } from "@/lib/profile";
import { ExecCta, ExecHeader, ExecKpi, ExecNavLink } from "./ExecutiveBits";
import GlassPanel from "./GlassPanel";

interface ExecData {
  industry: { slug: string; label: string } | null;
  global: { score: number; level: string; outlook: string };
  sectorPressure: { score: number; level: string; outlook: string; label: string } | null;
  exposure: { tracked: number; kev: number; ransomware: number; critical: number };
  financial: {
    impactUsd: number;
    likelihoodPct: number;
    aleUsd: number;
    band: string;
    benchmarkSource: string;
  };
  compliance: {
    frameworks: { name: string; focus: string; exposure: "aligned" | "at-risk" }[];
    openKev: number;
  };
  sectorThreat: { victims90d: number; groups: { name: string; victims: number }[] } | null;
}

const BAND_TONE: Record<string, string> = {
  Severe: "text-sev-critical",
  High: "text-sev-critical",
  Elevated: "text-sev-high",
  Moderate: "text-sev-medium",
  Low: "text-sev-low",
};
const LEVEL_TONE: Record<string, string> = {
  Severe: "text-sev-critical",
  Elevated: "text-sev-high",
  Guarded: "text-sev-medium",
  Low: "text-sev-low",
};

export default function CeoDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => setProfile(loadProfile()), []);

  const params = profile
    ? new URLSearchParams({
        vendors: profile.vendors.join(","),
        sector: profile.sector ?? "",
      }).toString()
    : null;
  const { data } = useSWR<ExecData>(
    profile ? `/api/executive?${params}` : null,
    fetcher,
    { refreshInterval: 300_000, keepPreviousData: true },
  );

  if (!profile) return null;
  const hasStack = profile.vendors.length > 0;

  const atRisk = data?.compliance.frameworks.filter((f) => f.exposure === "at-risk").length ?? 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16">
      <ExecHeader chip="Board View · CEO">
        <ExecNavLink href="/ciso">CISO View</ExecNavLink>
        <ExecNavLink href="/cyberthreatintel" accent="pulse">
          ⚡ Actions
        </ExecNavLink>
        <ExecNavLink href="/my" accent="pulse">
          Edit stack
        </ExecNavLink>
      </ExecHeader>

      {!hasStack ? (
        <ExecCta role="board" />
      ) : !data ? (
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-white/[0.05]" />
          <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
        </div>
      ) : (
        <>
          {/* Dollar hero */}
          <section className="animate-panel-in rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_30px_-10px] shadow-cyan-500/20 backdrop-blur-xl [animation-delay:80ms]">
            <p className="font-mono text-[10px] uppercase tracking-widest text-pulse">
              Annualized loss exposure {data.industry ? `· ${data.industry.label}` : ""}
            </p>
            <div className="mt-1 flex flex-wrap items-end gap-4">
              <span className={`font-mono text-5xl font-bold leading-none ${BAND_TONE[data.financial.band]}`}>
                {fmtUsd(data.financial.aleUsd)}
              </span>
              <span
                className={`mb-1 rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider ${BAND_TONE[data.financial.band]} border-current/40`}
              >
                {data.financial.band} risk
              </span>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-slate-300">
              A breach in your sector costs about{" "}
              <span className="font-semibold text-slate-100">{fmtUsd(data.financial.impactUsd)}</span>{" "}
              on average. With {data.compliance.openKev} actively-exploited{" "}
              {data.compliance.openKev === 1 ? "vulnerability" : "vulnerabilities"} unpatched in your
              stack and{" "}
              {data.sectorPressure
                ? `${data.sectorPressure.level.toLowerCase()} threat pressure`
                : "current threat pressure"}
              , the modeled annual likelihood is{" "}
              <span className="font-semibold text-slate-100">{data.financial.likelihoodPct}%</span>.
            </p>
            <p className="mt-3 border-t border-white/[0.06] pt-2.5 font-mono text-[10px] leading-relaxed text-slate-500">
              Illustrative ALE = {fmtUsd(data.financial.impactUsd)} impact ({data.financial.benchmarkSource})
              × {data.financial.likelihoodPct}% modeled likelihood. A directional indicator for
              prioritization — not a formal actuarial risk assessment.
            </p>
          </section>

          {/* Business KPIs */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ExecKpi
              label="Loss exposure / yr"
              value={fmtUsd(data.financial.aleUsd)}
              sub={`${data.financial.band} band`}
              tone={BAND_TONE[data.financial.band]}
            />
            <ExecKpi
              label="Impact if breached"
              value={fmtUsd(data.financial.impactUsd)}
              sub="sector benchmark"
              tone="text-slate-100"
            />
            <ExecKpi
              label="Annual likelihood"
              value={`${data.financial.likelihoodPct}%`}
              sub="modeled"
              tone="text-sev-high"
            />
            <ExecKpi
              label="Frameworks at risk"
              value={`${atRisk}/${data.compliance.frameworks.length}`}
              sub={data.industry?.label ?? "compliance"}
              tone={atRisk > 0 ? "text-sev-critical" : "text-sev-low"}
            />
          </div>

          {/* Compliance posture */}
          <div className="mt-4 animate-panel-in [animation-delay:200ms]">
            <GlassPanel title="Compliance Posture">
              <div className="divide-y divide-white/[0.04]">
                {data.compliance.frameworks.map((f) => (
                  <div key={f.name} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={`shrink-0 rounded border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${
                        f.exposure === "at-risk"
                          ? "border-sev-critical/40 bg-sev-critical/10 text-sev-critical"
                          : "border-sev-low/40 bg-sev-low/10 text-sev-low"
                      }`}
                    >
                      {f.exposure === "at-risk" ? "At risk" : "Aligned"}
                    </span>
                    <span className="w-44 shrink-0 font-medium text-slate-100">{f.name}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-500">
                      {f.focus}
                    </span>
                  </div>
                ))}
              </div>
              {data.compliance.openKev > 0 && (
                <p className="border-t border-white/[0.06] px-4 py-2.5 font-mono text-[10px] leading-relaxed text-slate-500">
                  {data.compliance.openKev} known-exploited{" "}
                  {data.compliance.openKev === 1 ? "vulnerability" : "vulnerabilities"} in your stack
                  implicate the patch-management controls in every framework above.
                </p>
              )}
            </GlassPanel>
          </div>

          {/* Business risk context */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ExecKpi
              label="Sector pressure"
              value={data.sectorPressure ? String(data.sectorPressure.score) : "—"}
              sub={
                data.sectorPressure
                  ? `${data.sectorPressure.label} · ${data.sectorPressure.outlook}`
                  : "pick a sector"
              }
              tone={data.sectorPressure ? (LEVEL_TONE[data.sectorPressure.level] ?? "text-sev-high") : "text-slate-400"}
              delay={220}
            />
            <ExecKpi
              label="Global pressure"
              value={String(data.global.score)}
              sub={`${data.global.level} · ${data.global.outlook}`}
              tone={LEVEL_TONE[data.global.level] ?? "text-neon"}
              delay={260}
            />
            <ExecKpi
              label="Sector victims · 90d"
              value={data.sectorThreat ? String(data.sectorThreat.victims90d) : "—"}
              sub={
                data.sectorThreat?.groups[0]
                  ? `top group: ${data.sectorThreat.groups[0].name}`
                  : "ransomware"
              }
              tone="text-sev-critical"
              delay={300}
            />
          </div>

          <p className="mt-6 px-2 font-mono text-[10px] uppercase tracking-wider text-slate-600">
            For the technical remediation plan, see the{" "}
            <a href="/ciso" className="text-neon hover:underline">
              CISO view
            </a>{" "}
            · methodology: FAIR-lite ALE over public benchmarks
          </p>
        </>
      )}
    </main>
  );
}
