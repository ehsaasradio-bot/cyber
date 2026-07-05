import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getIndustryDetail, slugify } from "@/lib/detail";
import { industryBySlug } from "@/lib/industries";
import { SOURCE_LABEL, timeAgo } from "@/lib/format";
import GlassPanel from "@/components/GlassPanel";
import {
  ChipRow,
  IntelHeader,
  StatBlock,
  VictimList,
  WeeklyBars,
} from "@/components/IntelBits";

export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ind = industryBySlug(slug);
  return { title: `${ind?.label ?? slug} — Industry Watch — CyberWeather` };
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ind = industryBySlug(slug);
  if (!ind) notFound();
  const detail = await getIndustryDetail(slug);

  const recentPace = detail.weekly.slice(-4).reduce((s, w) => s + w.victims, 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16">
      <IntelHeader chip="Industry Watch" />

      <section className="animate-panel-in rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_30px_-10px] shadow-cyan-500/20 backdrop-blur-xl [animation-delay:100ms]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-100">{ind.label}</h1>
          <Link
            href={`/?industry=${slug}`}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 transition-colors hover:border-neon/40 hover:text-neon"
          >
            ⌖ Locate on globe
          </Link>
        </div>
        <p className="mt-1 font-mono text-[11px] text-slate-500">
          Includes: {ind.sectors.join(", ")}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatBlock
            label="Victims · 90 days"
            value={detail.totalVictims90d.toLocaleString()}
            tone="text-sev-critical"
          />
          <StatBlock
            label="Victims · last 4 weeks"
            value={recentPace.toLocaleString()}
            tone="text-sev-high"
          />
        </div>

        <div className="mt-6">
          <WeeklyBars weekly={detail.weekly} />
        </div>

        <ChipRow
          label="Most active groups"
          items={detail.groups.map((g) => ({ name: g.name, victims: g.victims }))}
          hrefFor={(name) => `/group/${slugify(name)}`}
        />
        <ChipRow
          label="Most affected countries"
          items={detail.countries.map((c) => ({ name: c.country, victims: c.victims }))}
          hrefFor={(name) => `/country/${name}`}
        />
      </section>

      {detail.news.length > 0 && (
        <div className="mt-4 animate-panel-in [animation-delay:200ms]">
          <GlassPanel title={`Breaking news · ${ind.label}`} className="max-h-96">
            <ul className="divide-y divide-white/[0.04]">
              {detail.news.map((n) => {
                const meta = (n.metadata ?? {}) as Record<string, unknown>;
                const link = typeof meta.link === "string" ? meta.link : null;
                return (
                  <li key={n.id}>
                    <a
                      href={link ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] text-slate-200">
                        {n.title}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        {SOURCE_LABEL[n.source] ?? n.source} · {timeAgo(n.occurredAt.toISOString())}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </GlassPanel>
        </div>
      )}

      <div className="mt-4 animate-panel-in [animation-delay:300ms]">
        <GlassPanel title={`Recent victims · ${ind.label}`} className="max-h-[32rem]">
          <VictimList victims={detail.victims} context="sector" />
        </GlassPanel>
      </div>
    </main>
  );
}
