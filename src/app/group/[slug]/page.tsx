import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGroupDetail, slugify } from "@/lib/detail";
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
  return { title: `${slug} ransomware group — CyberWeather` };
}

export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getGroupDetail(slug);
  if (!detail) notFound();

  const recentPace = detail.weekly.slice(-4).reduce((s, w) => s + w.victims, 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16">
      <IntelHeader chip="Threat Group" />

      <section className="animate-panel-in rounded-2xl border border-sev-critical/20 bg-white/[0.04] p-6 shadow-[0_0_30px_-10px] shadow-sev-critical/30 backdrop-blur-xl [animation-delay:100ms]">
        <h1 className="font-mono text-2xl font-semibold text-sev-critical">
          {detail.name}
          <span className="ml-3 font-sans text-sm font-normal uppercase tracking-widest text-slate-500">
            Ransomware group
          </span>
        </h1>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatBlock
            label="Named victims · tracked"
            value={detail.totalVictims.toLocaleString()}
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
          label="Targeted sectors"
          items={detail.sectors.map((s) => ({ name: s.name, victims: s.victims }))}
          hrefFor={(name) => `/sector/${slugify(name)}`}
        />
        <ChipRow
          label="Targeted countries"
          items={detail.countries.map((c) => ({ name: c.country, victims: c.victims }))}
          hrefFor={(name) => `/country/${name}`}
        />
      </section>

      <div className="mt-4 animate-panel-in [animation-delay:250ms]">
        <GlassPanel title={`Recent victims · ${detail.name}`} className="max-h-[32rem]">
          <VictimList victims={detail.victims} context="group" />
        </GlassPanel>
      </div>
    </main>
  );
}
