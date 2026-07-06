"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher, SOURCE_LABEL, timeAgo } from "@/lib/format";
import { loadProfile, type Profile } from "@/lib/profile";
import { decide, URGENCY_ORDER, URGENCY_STYLE, type Urgency } from "@/lib/decisions";
import GlassPanel from "./GlassPanel";

interface ProfileCve {
  cveId: string;
  vendor: string;
  product: string | null;
  cvss: number | null;
  epss: number | null;
  isKev: boolean;
  ransomware: boolean;
  score: number;
}
interface IndexEntry {
  key: string;
  label: string;
  score: number;
  level: string;
  outlook: string;
}
interface WatchHit {
  term: string;
  cveHits: { cveId: string }[];
  newsHits: { id: number; title: string; occurredAt: string; link: string | null }[];
  eventHits: { id: number; title: string; occurredAt: string }[];
  total: number;
}

const LEVEL_TONE: Record<string, string> = {
  Severe: "text-sev-critical",
  Elevated: "text-sev-high",
  Guarded: "text-sev-medium",
  Low: "text-sev-low",
};

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function CyberThreatIntel() {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => setProfile(loadProfile()), []);

  const vendorsParam = profile?.vendors.length ? profile.vendors.join(",") : null;
  const { data: cveData } = useSWR<{ cves: ProfileCve[]; patchNow: number }>(
    vendorsParam ? `/api/profile/cves?vendors=${encodeURIComponent(vendorsParam)}` : null,
    fetcher,
    { refreshInterval: 300_000, keepPreviousData: true },
  );
  const { data: idx } = useSWR<{ global: IndexEntry; sectors: IndexEntry[] }>("/api/index", fetcher);
  const { data: brief } = useSWR<{ briefing: string; source: string; generatedAt: string }>(
    "/api/briefing",
    fetcher,
  );
  const { data: watchData } = useSWR<{ results: WatchHit[] }>(
    profile?.watch.length ? `/api/profile/watch?terms=${encodeURIComponent(profile.watch.join(","))}` : null,
    fetcher,
    { refreshInterval: 300_000, keepPreviousData: true },
  );

  const decisions = useMemo(() => {
    const cves = cveData?.cves ?? [];
    return cves
      .map(decide)
      .sort(
        (a, b) =>
          URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency) || b.score - a.score,
      );
  }, [cveData]);

  if (!profile) return null; // avoid hydration mismatch until localStorage is read

  const hasStack = profile.vendors.length > 0;
  const actNow = decisions.filter((d) => d.urgency === "Immediate" || d.urgency === "Urgent").length;
  const g = idx?.global;
  const sectorEntry = profile.sector ? idx?.sectors?.find((s) => s.key === profile.sector) : null;
  const byUrgency = URGENCY_ORDER.map((u) => ({
    u,
    n: decisions.filter((d) => d.urgency === u).length,
  })).filter((x) => x.n > 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16">
      <header className="flex animate-panel-in flex-wrap items-center gap-4 px-2 py-4">
        <Link
          href="/"
          className="font-mono text-lg font-semibold tracking-[0.35em] text-white transition-opacity hover:opacity-80"
        >
          CYBER<span className="text-neon">WEATHER</span>
        </Link>
        <span className="rounded-full border border-neon/30 bg-neon/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neon">
          Threat Intel
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <Link
            href="/ceo"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 transition-colors hover:border-neon/40 hover:text-neon"
          >
            Board View
          </Link>
          <Link
            href="/ciso"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 transition-colors hover:border-neon/40 hover:text-neon"
          >
            CISO View
          </Link>
          <Link
            href="/my"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 transition-colors hover:border-pulse/40 hover:text-pulse"
          >
            Edit stack
          </Link>
          <Link
            href="/trends"
            className="font-mono text-[11px] uppercase tracking-wider text-slate-400 transition-colors hover:text-neon"
          >
            Trends ↗
          </Link>
        </div>
      </header>

      {/* Morning brief hero */}
      <section className="animate-panel-in rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_30px_-10px] shadow-cyan-500/20 backdrop-blur-xl [animation-delay:80ms]">
        <p className="font-mono text-[10px] uppercase tracking-widest text-pulse">
          {greeting()} · your daily brief
        </p>
        <p className="mt-2 text-[15px] font-medium leading-relaxed text-slate-100">
          {hasStack ? (
            actNow > 0 ? (
              <>
                <span className="text-sev-critical">{actNow}</span> priorit
                {actNow === 1 ? "y" : "ies"} in your stack need attention today.
              </>
            ) : (
              <>No urgent actions in your stack right now — you&apos;re clear.</>
            )
          ) : (
            <>Describe your environment to turn the global picture into your priorities.</>
          )}
        </p>
        {brief && (
          <p className="mt-3 border-t border-white/[0.06] pt-3 text-[13px] leading-relaxed text-slate-400">
            {brief.briefing}
          </p>
        )}
      </section>

      {/* Executive KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label="Global pressure"
          value={g ? String(g.score) : "—"}
          sub={g ? `${g.level} · ${g.outlook}` : ""}
          tone={g ? (LEVEL_TONE[g.level] ?? "text-neon") : "text-slate-100"}
        />
        <Kpi
          label="Act now"
          value={hasStack ? String(actNow) : "—"}
          sub="immediate + urgent"
          tone="text-sev-critical"
        />
        <Kpi
          label="Patch now"
          value={cveData ? String(cveData.patchNow) : hasStack ? "…" : "—"}
          sub="KEV + high EPSS"
          tone="text-sev-high"
        />
        <Kpi
          label="Sector pressure"
          value={sectorEntry ? String(sectorEntry.score) : "—"}
          sub={sectorEntry ? `${sectorEntry.label}` : "pick a sector"}
          tone={sectorEntry ? (LEVEL_TONE[sectorEntry.level] ?? "text-sev-high") : "text-slate-400"}
        />
      </div>

      {/* Priority actions — the decisions */}
      <section className="mt-4">
        <div className="flex items-center gap-3 px-2 pb-2">
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
            Priority Actions
          </h2>
          {byUrgency.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {byUrgency.map(({ u, n }) => (
                <span
                  key={u}
                  className={`rounded border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${URGENCY_STYLE[u].text} ${URGENCY_STYLE[u].border} ${URGENCY_STYLE[u].bg}`}
                >
                  {n} {u}
                </span>
              ))}
            </div>
          )}
        </div>

        {!hasStack ? (
          <SetupCta />
        ) : !cveData ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.05]" />
            ))}
          </div>
        ) : decisions.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center font-mono text-xs uppercase tracking-widest text-slate-500">
            No tracked CVEs for your stack — quiet right now
          </div>
        ) : (
          <div className="space-y-3">
            {decisions.slice(0, 8).map((d, i) => {
              const s = URGENCY_STYLE[d.urgency];
              return (
                <Link
                  key={d.cveId}
                  href={`/cve/${d.cveId}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={`group flex animate-panel-in items-center gap-4 rounded-xl border ${s.border} ${s.bg} p-4 transition-colors hover:bg-white/[0.06]`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded border px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-wider ${s.text} ${s.border}`}
                      >
                        {d.urgency} · {d.window}
                      </span>
                      <span className="font-mono text-[11px] text-neon">{d.cveId}</span>
                    </div>
                    <p className="mt-1.5 text-[15px] font-medium text-slate-100">
                      {d.verb} {d.vendor}
                      {d.product ? ` ${d.product}` : ""}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-400">
                      {d.rationale}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-center">
                    <span className={`font-mono text-2xl font-bold leading-none ${s.text}`}>
                      {Math.round(d.score)}
                    </span>
                    <span className="mt-1 font-mono text-[8px] uppercase tracking-widest text-slate-600">
                      risk
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Watchlist */}
      {profile.watch.length > 0 && (
        <div className="mt-4 animate-panel-in [animation-delay:200ms]">
          <GlassPanel title="Technology Watch · live matches" className="max-h-96">
            {!watchData ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-4 animate-pulse rounded bg-white/[0.06]" />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {watchData.results.map((r) => (
                  <li key={r.term} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-40 shrink-0 font-mono text-[12px] font-medium text-sev-medium">
                      👁 {r.term}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-slate-400">
                      {r.total === 0
                        ? "Quiet — nothing tracked yet"
                        : (r.newsHits[0]?.title ??
                          r.eventHits[0]?.title ??
                          `${r.cveHits.length} related CVE${r.cveHits.length === 1 ? "" : "s"}`)}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      {r.total} match{r.total === 1 ? "" : "es"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </div>
      )}

      <p className="mt-6 px-2 font-mono text-[10px] uppercase tracking-wider text-slate-600">
        Personalized from your stack profile · {SOURCE_LABEL.cisa_kev} · NVD · EPSS ·{" "}
        {brief ? `brief ${timeAgo(brief.generatedAt)}` : "loading brief"}
      </p>
    </main>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <div className="animate-panel-in rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 [animation-delay:120ms]">
      <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="truncate font-mono text-[9px] text-slate-500">{sub}</p>
    </div>
  );
}

function SetupCta() {
  return (
    <Link
      href="/my"
      className="block rounded-xl border border-pulse/30 bg-pulse/[0.06] p-8 text-center transition-colors hover:bg-pulse/[0.12]"
    >
      <p className="font-mono text-sm uppercase tracking-widest text-pulse">
        Describe your environment →
      </p>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-slate-400">
        Pick your vendors, sector and technologies in My Weather. CyberThreatIntel turns the global
        threat picture into a short, ranked list of exactly what your team should do — no log
        integration required.
      </p>
    </Link>
  );
}
