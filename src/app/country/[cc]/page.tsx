import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCountryDetail } from "@/lib/detail";
import GlassPanel from "@/components/GlassPanel";
import SeverityBadge from "@/components/SeverityBadge";
import { SOURCE_LABEL } from "@/lib/format";

export const runtime = "nodejs";

const TYPE_LABEL: Record<string, string> = {
  ransomware_victim: "Ransomware victims",
  c2_server: "Botnet C2 servers",
  attack_source: "Attack sources",
  malware_url: "Malware hosts",
  kev_added: "KEV additions",
  cve_critical: "Critical CVEs",
};

function flagEmoji(cc: string): string {
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cc: string }>;
}): Promise<Metadata> {
  const { cc } = await params;
  return { title: `${cc.toUpperCase()} threat profile — CyberWeather` };
}

function Stat({ label, value, tone = "text-slate-100" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export default async function CountryPage({ params }: { params: Promise<{ cc: string }> }) {
  const { cc: raw } = await params;
  if (!/^[A-Za-z]{2}$/.test(raw)) notFound();
  const { cc, name, stats, byType, byDay, events } = await getCountryDetail(raw);

  const maxDay = Math.max(1, ...byDay.map((d) => d.count));

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16">
      <header className="flex animate-panel-in items-center gap-4 px-2 py-4">
        <Link
          href="/"
          className="font-mono text-lg font-semibold tracking-[0.35em] text-white transition-opacity hover:opacity-80"
        >
          CYBER<span className="text-neon">WEATHER</span>
        </Link>
        <span className="rounded-full border border-neon/30 bg-neon/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neon">
          Country Intel
        </span>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href={`/?country=${cc}`}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 transition-colors hover:border-neon/40 hover:text-neon"
          >
            ⌖ Locate on globe
          </Link>
          <Link
            href="/trends"
            className="font-mono text-[11px] uppercase tracking-wider text-slate-400 transition-colors hover:text-neon"
          >
            Trends ↗
          </Link>
        </div>
      </header>

      <section className="animate-panel-in rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_30px_-10px] shadow-cyan-500/20 backdrop-blur-xl [animation-delay:100ms]">
        <h1 className="flex items-center gap-3 text-2xl font-semibold text-slate-100">
          <span className="text-3xl">{flagEmoji(cc)}</span>
          {name}
          <span className="font-mono text-base tracking-widest text-slate-500">{cc}</span>
        </h1>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Events · 7 days" value={stats.events7d.toLocaleString()} tone="text-neon" />
          <Stat
            label="Critical · 7 days"
            value={stats.critical7d.toLocaleString()}
            tone="text-sev-critical"
          />
          <Stat
            label="Ransomware victims · 90 days"
            value={stats.ransomware90d.toLocaleString()}
            tone="text-sev-high"
          />
        </div>

        {byType.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {byType.map((t) => (
              <span
                key={t.type}
                className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400"
              >
                {TYPE_LABEL[t.type] ?? t.type}
                <span className="ml-1.5 text-neon">{t.n}</span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-6">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">
            Daily events · 14 days
          </p>
          <div className="flex h-16 items-end gap-1">
            {byDay.map((d) => (
              <div
                key={d.date}
                title={`${d.date} · ${d.count} events`}
                className="flex-1 rounded-t-sm bg-neon/70 transition-colors hover:bg-neon"
                style={{ height: `${Math.max(d.count > 0 ? 6 : 1, (d.count / maxDay) * 100)}%` }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-600">
            <span>{byDay[0]?.date}</span>
            <span>today</span>
          </div>
        </div>
      </section>

      <div className="mt-4 animate-panel-in [animation-delay:250ms]">
        <GlassPanel title={`Latest activity · ${cc}`} className="max-h-[32rem]">
          {events.length === 0 ? (
            <div className="flex h-32 items-center justify-center font-mono text-xs uppercase tracking-widest text-slate-500">
              No recorded events
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {events.map((e) => {
                const meta = (e.metadata ?? {}) as Record<string, unknown>;
                const cveId = typeof meta.cveId === "string" ? meta.cveId : null;
                return (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                    <SeverityBadge severity={e.severity} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-slate-200">{e.title}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        {SOURCE_LABEL[e.source] ?? e.source} ·{" "}
                        {e.occurredAt.toISOString().slice(0, 10)}
                        {typeof meta.sector === "string" && meta.sector && ` · ${meta.sector}`}
                      </p>
                    </div>
                    {cveId && (
                      <Link
                        href={`/cve/${cveId}`}
                        className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-neon hover:underline"
                      >
                        {cveId}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </GlassPanel>
      </div>
    </main>
  );
}
