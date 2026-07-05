import Link from "next/link";
import type { Metadata } from "next";
import { INDUSTRIES } from "@/lib/industries";
import { listIndustries } from "@/lib/detail";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "Industry Watch — CyberWeather" };

const LEVEL_TONE = (n: number) => {
  if (n >= 100) return "border-sev-critical/40 text-sev-critical";
  if (n >= 40) return "border-sev-high/40 text-sev-high";
  if (n >= 10) return "border-sev-medium/40 text-sev-medium";
  return "border-sev-low/40 text-sev-low";
};

export default async function IndustryOverviewPage() {
  const counts = await listIndustries();

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
          Industry Watch
        </span>
        <Link
          href="/trends"
          className="ml-auto font-mono text-[11px] uppercase tracking-wider text-slate-400 transition-colors hover:text-neon"
        >
          Trends ↗
        </Link>
      </header>

      <p className="animate-panel-in px-2 text-[13px] leading-relaxed text-slate-400 [animation-delay:50ms]">
        Ransomware pressure and breaking news, broken out by industry — pick the one you operate
        in.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INDUSTRIES.map((ind, i) => {
          const n = counts.get(ind.slug) ?? 0;
          return (
            <Link
              key={ind.slug}
              href={`/industry/${ind.slug}`}
              style={{ animationDelay: `${100 + i * 60}ms` }}
              className="group animate-panel-in rounded-xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-colors hover:border-neon/30 hover:bg-white/[0.07]"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-slate-100 group-hover:text-white">{ind.label}</h2>
                <span className="font-mono text-[10px] text-slate-600 opacity-0 transition-opacity group-hover:opacity-100">
                  →
                </span>
              </div>
              <div
                className={`mt-3 inline-flex items-baseline gap-1.5 rounded border px-2 py-1 ${LEVEL_TONE(n)}`}
              >
                <span className="font-mono text-lg font-semibold">{n}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider">
                  victims · 90d
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
