import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCveDetail } from "@/lib/detail";
import SeverityBadge from "@/components/SeverityBadge";
import GlassPanel from "@/components/GlassPanel";
import { SOURCE_LABEL } from "@/lib/format";

export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `${decodeURIComponent(id)} — CyberWeather` };
}

function Chip({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-0.5 font-mono text-base font-semibold ${tone || "text-slate-100"}`}>
        {value}
      </p>
    </div>
  );
}

function UntrackedCve({ cveId }: { cveId: string }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4">
      <div className="animate-panel-in rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
        <h1 className="font-mono text-2xl font-semibold text-neon">{cveId}</h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-slate-500">
          Outside CyberWeather&apos;s tracked universe
          <br />
          (KEV + recently modified CVEs)
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {[
            ["NVD", `https://nvd.nist.gov/vuln/detail/${cveId}`],
            ["MITRE", `https://www.cve.org/CVERecord?id=${cveId}`],
          ].map(([name, url]) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400 transition-colors hover:border-neon/40 hover:text-neon"
            >
              {name} ↗
            </a>
          ))}
        </div>
        <Link
          href="/"
          className="mt-6 inline-block font-mono text-[11px] uppercase tracking-wider text-slate-500 hover:text-neon"
        >
          ← Command center
        </Link>
      </div>
    </main>
  );
}

export default async function CvePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cveId = decodeURIComponent(id).toUpperCase();
  if (!/^CVE-\d{4}-\d{4,}$/.test(cveId)) notFound();
  const detail = await getCveDetail(cveId);
  if (!detail) return <UntrackedCve cveId={cveId} />;
  const { cve, related } = detail;

  const score = Number(cve.priorityScore);
  const sev = (cve.cvssSeverity ?? (cve.kevRansomware ? "CRITICAL" : "HIGH")).toLowerCase();

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-16">
      <header className="flex animate-panel-in items-center gap-4 px-2 py-4">
        <Link
          href="/"
          className="font-mono text-lg font-semibold tracking-[0.35em] text-white transition-opacity hover:opacity-80"
        >
          CYBER<span className="text-neon">WEATHER</span>
        </Link>
        <span className="rounded-full border border-neon/30 bg-neon/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neon">
          CVE Intel
        </span>
        <Link
          href="/trends"
          className="ml-auto font-mono text-[11px] uppercase tracking-wider text-slate-400 transition-colors hover:text-neon"
        >
          Trends ↗
        </Link>
      </header>

      <section className="animate-panel-in rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_30px_-10px] shadow-cyan-500/20 backdrop-blur-xl [animation-delay:100ms]">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold text-neon">{cve.cveId}</h1>
          <SeverityBadge severity={sev} />
          {cve.isKev && (
            <span className="rounded border border-sev-high/40 bg-sev-high/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sev-high">
              KEV · Actively exploited
            </span>
          )}
          {cve.kevRansomware && (
            <span className="rounded border border-sev-critical/40 bg-sev-critical/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sev-critical">
              Ransomware campaigns
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Chip
            label="Priority score"
            value={score.toFixed(1)}
            tone={score >= 80 ? "text-sev-critical" : score >= 50 ? "text-sev-high" : "text-neon"}
          />
          <Chip label="CVSS" value={cve.cvssScore ? String(cve.cvssScore) : "—"} />
          <Chip
            label="EPSS (exploit prob.)"
            value={cve.epssScore ? `${(Number(cve.epssScore) * 100).toFixed(1)}%` : "—"}
          />
          <Chip
            label="EPSS percentile"
            value={cve.epssPercentile ? `${(Number(cve.epssPercentile) * 100).toFixed(0)}th` : "—"}
          />
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neon to-pulse"
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>

        {cve.description && (
          <p className="mt-5 text-[14px] leading-relaxed text-slate-300">{cve.description}</p>
        )}

        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 font-mono text-[12px]">
          {cve.vendor && (
            <>
              <dt className="uppercase tracking-wider text-slate-500">Vendor / Product</dt>
              <dd className="text-slate-200">
                {[cve.vendor, cve.product].filter(Boolean).join(" · ")}
              </dd>
            </>
          )}
          {cve.kevDateAdded && (
            <>
              <dt className="uppercase tracking-wider text-slate-500">KEV since</dt>
              <dd className="text-slate-200">{cve.kevDateAdded}</dd>
            </>
          )}
          {cve.publishedAt && (
            <>
              <dt className="uppercase tracking-wider text-slate-500">Published</dt>
              <dd className="text-slate-200">{cve.publishedAt.toISOString().slice(0, 10)}</dd>
            </>
          )}
          {cve.lastModified && (
            <>
              <dt className="uppercase tracking-wider text-slate-500">Last modified</dt>
              <dd className="text-slate-200">{cve.lastModified.toISOString().slice(0, 10)}</dd>
            </>
          )}
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["NVD", `https://nvd.nist.gov/vuln/detail/${cve.cveId}`],
            ["MITRE", `https://www.cve.org/CVERecord?id=${cve.cveId}`],
            ["Exploit-DB", `https://www.exploit-db.com/search?cve=${cve.cveId}`],
            ["GitHub PoCs", `https://github.com/search?q=%22${cve.cveId}%22&type=repositories`],
          ].map(([name, url]) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400 transition-colors hover:border-neon/40 hover:text-neon"
            >
              {name} ↗
            </a>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <div className="mt-4 animate-panel-in [animation-delay:250ms]">
          <GlassPanel title="Related activity" className="max-h-96">
            <ul className="divide-y divide-white/[0.04]">
              {related.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                  <SeverityBadge severity={e.severity} />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-slate-200">
                    {e.title}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    {SOURCE_LABEL[e.source] ?? e.source} ·{" "}
                    {e.occurredAt.toISOString().slice(0, 10)}
                  </span>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </div>
      )}
    </main>
  );
}
