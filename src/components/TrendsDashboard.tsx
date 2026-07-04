"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher, slugify } from "@/lib/format";
import GlassPanel from "./GlassPanel";
import StatChips from "./StatChips";
import AreaTrend from "./charts/AreaTrend";
import HBars from "./charts/HBars";
import ScatterQuad from "./charts/ScatterQuad";
import Histogram from "./charts/Histogram";
import Donut from "./charts/Donut";
import Sparkline from "./charts/Sparkline";

/* ---------------------------------- data --------------------------------- */

interface KevMonthly {
  months: { month: string; total: number; ransomware: number }[];
}
interface RiskMatrix {
  cves: { cveId: string; cvss: number; epss: number; isKev: boolean; priorityScore: number }[];
}
interface EpssDistribution {
  buckets: { lo: number; hi: number; count: number }[];
  kevCount: number;
  total: number;
}
interface Vendors {
  vendors: { vendor: string; total: number; ransomware: number }[];
}
interface Malware {
  families: { name: string; count: number; online: number }[];
}
interface Countries {
  countries: { country: string; total: number; byDay: number[] }[];
}
interface SeverityDaily {
  days: { date: string; critical: number; high: number; medium: number; low: number }[];
}

function useTrend<T>(endpoint: string) {
  return useSWR<T>(`/api/trends/${endpoint}`, fetcher, {
    refreshInterval: 300_000,
    keepPreviousData: true,
  });
}

/* ------------------------------ shared bits ------------------------------ */

function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded bg-white/[0.05]"
          style={{ height: 14 + ((i * 17) % 18), animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

function AwaitingSignal() {
  return (
    <div className="flex h-40 items-center justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-slate-600">
      Awaiting Signal
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">
      {children}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}` }}
      />
      {label}
    </span>
  );
}

/* --------------------------------- panels -------------------------------- */

function KevMonthlyPanel() {
  const { data, isLoading } = useTrend<KevMonthly>("kev-monthly");
  if (isLoading && !data) return <Skeleton rows={6} />;
  const months = data?.months ?? [];
  if (months.length === 0) return <AwaitingSignal />;
  return (
    <div className="p-4">
      <AreaTrend
        data={months.map((m) => ({ label: m.month, value: m.total, value2: m.ransomware }))}
      />
      <Caption>
        <LegendDot color="#22d3ee" label="All KEV" />
        <LegendDot color="#f43f5e" label="Ransomware-linked" />
      </Caption>
    </div>
  );
}

function RiskMatrixPanel() {
  const { data, isLoading } = useTrend<RiskMatrix>("risk-matrix");
  if (isLoading && !data) return <Skeleton rows={8} />;
  const cves = data?.cves ?? [];
  if (cves.length === 0) return <AwaitingSignal />;
  return (
    <div className="p-4 pt-6">
      <ScatterQuad
        points={cves.map((c) => ({ x: c.epss, y: c.cvss, id: c.cveId, highlight: c.isKev }))}
        xLabel="EPSS →"
        yLabel="CVSS →"
        onPointClick={(id) =>
          (window.location.href = `/cve/${id}`)
        }
      />
      <Caption>
        <span>
          {cves.length.toLocaleString()} CVEs ·{" "}
          <span className="text-sev-critical">red = KEV (actively exploited)</span>
        </span>
      </Caption>
    </div>
  );
}

function EpssPanel() {
  const { data, isLoading } = useTrend<EpssDistribution>("epss-distribution");
  if (isLoading && !data) return <Skeleton rows={6} />;
  const buckets = data?.buckets ?? [];
  if (buckets.length === 0) return <AwaitingSignal />;
  return (
    <div className="p-4 pt-8">
      <Histogram
        buckets={buckets.map((b) => ({
          label: `${Math.round(b.lo * 100)}-${Math.round(b.hi * 100)}%`,
          count: b.count,
        }))}
      />
      <Caption>
        <span>
          <span className="text-sev-critical">{(data?.kevCount ?? 0).toLocaleString()}</span> of{" "}
          {(data?.total ?? 0).toLocaleString()} scored CVEs on the KEV list
        </span>
      </Caption>
    </div>
  );
}

function VendorsPanel() {
  const { data, isLoading } = useTrend<Vendors>("vendors");
  if (isLoading && !data) return <Skeleton rows={8} />;
  const vendors = data?.vendors ?? [];
  if (vendors.length === 0) return <AwaitingSignal />;
  return (
    <div className="p-4">
      <HBars
        data={vendors.map((v) => ({ label: v.vendor, value: v.total, accent: v.ransomware }))}
      />
      <Caption>
        <LegendDot color="#f43f5e" label="Red segment = ransomware campaigns" />
      </Caption>
    </div>
  );
}

function MalwarePanel() {
  const { data, isLoading } = useTrend<Malware>("malware");
  if (isLoading && !data) return <Skeleton rows={4} />;
  const families = data?.families ?? [];
  if (families.length === 0) return <AwaitingSignal />;
  return (
    <div className="p-4">
      <Donut slices={families.map((f) => ({ label: f.name, value: f.count }))} />
      <Caption>
        <span>C2 servers observed per family (Feodo tracker)</span>
      </Caption>
    </div>
  );
}

function CountriesPanel() {
  const { data, isLoading } = useTrend<Countries>("countries");
  if (isLoading && !data) return <Skeleton rows={8} />;
  const countries = data?.countries ?? [];
  if (countries.length === 0) return <AwaitingSignal />;
  return (
    <div className="flex flex-col gap-1 p-4">
      {countries.map((c, i) => {
        const top = i === 0;
        return (
          <Link
            key={c.country}
            href={`/?country=${c.country}`}
            title={`Locate ${c.country} threats on the globe`}
            className="group flex items-center gap-3 rounded px-1 py-1 transition-colors hover:bg-white/[0.05]"
          >
            <span
              className={`w-8 shrink-0 font-mono text-[11px] tracking-widest ${
                top ? "font-semibold text-neon" : "text-slate-400"
              }`}
            >
              {c.country}
            </span>
            <div className="flex min-w-0 flex-1 justify-center">
              <Sparkline values={c.byDay} color={top ? "#22d3ee" : "#475569"} width={96} height={20} />
            </div>
            <span
              className={`w-14 shrink-0 text-right font-mono text-[11px] tabular-nums ${
                top ? "text-neon" : "text-slate-300"
              }`}
            >
              {c.total.toLocaleString()}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-neon opacity-0 transition-opacity group-hover:opacity-100">
              ⌖
            </span>
          </Link>
        );
      })}
      <Caption>
        <span>Geolocated threat events · click a row to locate on the globe</span>
      </Caption>
    </div>
  );
}

/* ------------------------ severity stacked bars (g) ----------------------- */

type SevDay = SeverityDaily["days"][number];
type SevKey = "critical" | "high" | "medium" | "low";

const SEV_STACK: [SevKey, string][] = [
  ["low", "var(--color-sev-low)"],
  ["medium", "var(--color-sev-medium)"],
  ["high", "var(--color-sev-high)"],
  ["critical", "var(--color-sev-critical)"],
];

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function SeverityStack({ days }: { days: SevDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = days.map((d) => d.critical + d.high + d.medium + d.low);
  const max = Math.max(1, ...totals);

  return (
    <div className="relative flex h-44 items-end gap-1.5 px-1 pb-5 pt-8">
      {days.map((d, i) => {
        const total = totals[i];
        return (
          <div
            key={d.date}
            className="group relative flex h-full flex-1 flex-col justify-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {total > 0 ? (
              <div
                className="flex w-full origin-bottom animate-bar-grow flex-col-reverse overflow-hidden rounded-t-sm opacity-80 transition-opacity group-hover:opacity-100"
                style={{ height: `${(total / max) * 100}%`, animationDelay: `${i * 30}ms` }}
              >
                {SEV_STACK.map(([sev, color]) =>
                  d[sev] > 0 ? (
                    <div
                      key={sev}
                      style={{ backgroundColor: color, height: `${(d[sev] / total) * 100}%` }}
                    />
                  ) : null,
                )}
              </div>
            ) : (
              <div className="h-px w-full rounded bg-white/[0.06]" />
            )}
            {hover === i && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-void/95 px-2.5 py-1.5 font-mono text-[10px] text-slate-300 shadow-xl">
                <div>
                  <span className="text-slate-500">{dayLabel(d.date)} · </span>
                  {total} events
                </div>
                <div className="mt-0.5 flex gap-2.5">
                  <span className="text-sev-critical">{d.critical} crit</span>
                  <span className="text-sev-high">{d.high} high</span>
                  <span className="text-sev-medium">{d.medium} med</span>
                  <span className="text-sev-low">{d.low} low</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div className="absolute bottom-0 left-1 font-mono text-[9px] uppercase tracking-wider text-slate-600">
        {days[0] && dayLabel(days[0].date)}
      </div>
      <div className="absolute bottom-0 right-1 font-mono text-[9px] uppercase tracking-wider text-slate-600">
        today
      </div>
    </div>
  );
}

function SeverityPanel() {
  const { data, isLoading } = useTrend<SeverityDaily>("severity-daily");
  if (isLoading && !data) return <Skeleton rows={6} />;
  const days = data?.days ?? [];
  if (days.length === 0 || days.every((d) => d.critical + d.high + d.medium + d.low === 0)) {
    return <AwaitingSignal />;
  }
  return (
    <div className="p-4">
      <SeverityStack days={days} />
      <Caption>
        <LegendDot color="var(--color-sev-critical)" label="Critical" />
        <LegendDot color="var(--color-sev-high)" label="High" />
        <LegendDot color="var(--color-sev-medium)" label="Medium" />
        <LegendDot color="var(--color-sev-low)" label="Low" />
      </Caption>
    </div>
  );
}

/* --------------------------- ransomware panel (h) ------------------------- */

interface RansomwareTrendData {
  weeks: { week: string; victims: number }[];
  groups: { group: string; victims: number }[];
  totalVictims: number;
}

function RansomwarePanel() {
  const { data, isLoading } = useTrend<RansomwareTrendData>("ransomware");
  if (isLoading && !data) return <Skeleton rows={7} />;
  const weeks = data?.weeks ?? [];
  if (weeks.length === 0 || weeks.every((w) => w.victims === 0)) return <AwaitingSignal />;
  const top = (data?.groups ?? []).slice(0, 5);
  return (
    <div className="p-4">
      <AreaTrend
        data={weeks.map((w) => ({ label: w.week.slice(5), value: w.victims }))}
        color="#f43f5e"
        height={150}
      />
      {top.length > 0 && (
        <div className="mt-3 border-t border-white/[0.06] pt-2.5">
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-slate-500">
            Most active groups
          </p>
          <div className="flex flex-wrap gap-1.5">
            {top.map((g) => (
              <Link
                key={g.group}
                href={`/group/${slugify(g.group)}`}
                className="rounded border border-sev-critical/30 bg-sev-critical/[0.08] px-2 py-0.5 font-mono text-[10px] text-slate-300 transition-colors hover:bg-sev-critical/[0.18]"
              >
                {g.group} <span className="text-sev-critical">{g.victims}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <Caption>
        <span>
          {data?.totalVictims.toLocaleString()} named victims · 12 weeks · Ransomware.live
        </span>
      </Caption>
    </div>
  );
}

/* ----------------------------- sector panel (i) --------------------------- */

interface SectorsData {
  sectors: { name: string; slug: string; victims: number }[];
}

function SectorsPanel() {
  const { data, isLoading } = useTrend<SectorsData>("sectors");
  if (isLoading && !data) return <Skeleton rows={8} />;
  const sectors = (data?.sectors ?? []).slice(0, 10);
  if (sectors.length === 0) return <AwaitingSignal />;
  const max = Math.max(1, ...sectors.map((s) => s.victims));
  return (
    <div className="flex flex-col gap-1 p-4">
      {sectors.map((s, i) => (
        <Link
          key={s.slug}
          href={`/sector/${s.slug}`}
          className="group flex items-center gap-3 rounded px-1 py-1 transition-colors hover:bg-white/[0.05]"
        >
          <span
            className={`w-44 shrink-0 truncate font-mono text-[11px] ${
              i === 0 ? "font-semibold text-neon" : "text-slate-400"
            }`}
            title={s.name}
          >
            {s.name}
          </span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sev-critical/80 to-sev-high/80"
              style={{ width: `${(s.victims / max) * 100}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-300">
            {s.victims}
          </span>
          <span className="shrink-0 font-mono text-[11px] text-neon opacity-0 transition-opacity group-hover:opacity-100">
            →
          </span>
        </Link>
      ))}
      <Caption>
        <span>Ransomware victims by sector · 90 days · click for sector intel</span>
      </Caption>
    </div>
  );
}

/* ---------------------------------- page --------------------------------- */

export default function TrendsDashboard() {
  return (
    <div className="min-h-screen w-full">
      <header className="flex animate-panel-in items-center gap-4 px-6 pt-4">
        <Link
          href="/"
          className="font-mono text-lg font-semibold tracking-[0.35em] text-white transition-opacity hover:opacity-80"
        >
          CYBER<span className="text-neon">WEATHER</span>
        </Link>
        <span className="rounded-full border border-pulse/30 bg-pulse/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-pulse">
          Trend Analytics
        </span>
        <Link
          href="/my"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 transition-colors hover:border-pulse/40 hover:text-pulse"
        >
          My Weather
        </Link>
        <StatChips />
      </header>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 2xl:grid-cols-3">
        <GlassPanel
          title="KEV Additions · 24 Months"
          className="animate-panel-in"
        >
          <KevMonthlyPanel />
        </GlassPanel>

        <GlassPanel
          title="Ransomware Victims · 12 Weeks"
          className="animate-panel-in [animation-delay:100ms]"
        >
          <RansomwarePanel />
        </GlassPanel>

        <GlassPanel
          title="Risk Matrix · Exploitability × Impact"
          className="animate-panel-in lg:col-span-2 [animation-delay:150ms]"
        >
          <RiskMatrixPanel />
        </GlassPanel>

        <GlassPanel
          title="Exploit Probability Distribution"
          className="animate-panel-in [animation-delay:200ms]"
        >
          <EpssPanel />
        </GlassPanel>

        <GlassPanel
          title="Most-Exploited Vendors"
          className="animate-panel-in [animation-delay:300ms]"
        >
          <VendorsPanel />
        </GlassPanel>

        <GlassPanel
          title="Botnet C2 · Malware Families"
          className="animate-panel-in [animation-delay:400ms]"
        >
          <MalwarePanel />
        </GlassPanel>

        <GlassPanel
          title="Attack Origins · 7 Days"
          className="animate-panel-in [animation-delay:500ms]"
        >
          <CountriesPanel />
        </GlassPanel>

        <GlassPanel
          title="Severity Mix · 14 Days"
          className="animate-panel-in [animation-delay:600ms]"
        >
          <SeverityPanel />
        </GlassPanel>

        <GlassPanel
          title="Ransomware by Sector · 90 Days"
          className="animate-panel-in [animation-delay:700ms]"
        >
          <SectorsPanel />
        </GlassPanel>
      </div>
    </div>
  );
}
