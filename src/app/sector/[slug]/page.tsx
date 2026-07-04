import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSectorDetail, slugify } from "@/lib/detail";
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
  return { title: `${slug} sector — CyberWeather` };
}

export default async function SectorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getSectorDetail(slug);
  if (!detail) notFound();

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16">
      <IntelHeader chip="Sector Intel" />

      <section className="animate-panel-in rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_30px_-10px] shadow-cyan-500/20 backdrop-blur-xl [animation-delay:100ms]">
        <h1 className="text-2xl font-semibold text-slate-100">
          {detail.name}
          <span className="ml-3 font-mono text-sm uppercase tracking-widest text-slate-500">
            Ransomware pressure
          </span>
        </h1>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatBlock
            label="Victims · 90 days"
            value={detail.totalVictims90d.toLocaleString()}
            tone="text-sev-critical"
          />
          <StatBlock
            label="Victims · 14 days"
            value={detail.victims14d.toLocaleString()}
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

      <div className="mt-4 animate-panel-in [animation-delay:250ms]">
        <GlassPanel title={`Recent victims · ${detail.name}`} className="max-h-[32rem]">
          <VictimList victims={detail.victims} context="sector" />
        </GlassPanel>
      </div>
    </main>
  );
}
