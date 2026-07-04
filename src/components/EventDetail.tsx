"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import SeverityBadge from "./SeverityBadge";
import { fetcher, SOURCE_LABEL, timeAgo } from "@/lib/format";
import { onGlobeSelect, selectGlobeEvent, type GlobeSelection } from "@/lib/globeBus";

interface IpIntel {
  found: boolean;
  ports?: number[];
  vulns?: string[];
  tags?: string[];
  hostnames?: string[];
  cpes?: string[];
}

const PIVOTS: [string, (ip: string) => string][] = [
  ["AbuseIPDB", (ip) => `https://www.abuseipdb.com/check/${ip}`],
  ["Shodan", (ip) => `https://www.shodan.io/host/${ip}`],
  ["VirusTotal", (ip) => `https://www.virustotal.com/gui/ip-address/${ip}`],
  ["GreyNoise", (ip) => `https://viz.greynoise.io/ip/${ip}`],
];

/** SOC drill-down card for the selected globe/feed event, enriched via Shodan InternetDB. */
export default function EventDetail() {
  const [sel, setSel] = useState<GlobeSelection | null>(null);

  useEffect(() => onGlobeSelect(setSel), []);

  const { data: intel } = useSWR<IpIntel>(
    sel?.ip ? `/api/ip/${sel.ip}` : null,
    fetcher,
  );

  if (!sel) return null;

  const meta = (sel.metadata ?? {}) as Record<string, unknown>;
  const metaRows: [string, string][] = [];
  if (meta.malware) metaRows.push(["Malware", String(meta.malware)]);
  if (meta.port) metaRows.push(["C2 port", String(meta.port)]);
  if (meta.asName || meta.asn)
    metaRows.push(["AS", [meta.asn && `AS${meta.asn}`, meta.asName].filter(Boolean).join(" · ")]);
  if (meta.reports) metaRows.push(["Honeypot reports", Number(meta.reports).toLocaleString()]);
  if (meta.targets) metaRows.push(["Targets hit", Number(meta.targets).toLocaleString()]);
  if (meta.status) metaRows.push(["Status", String(meta.status).toUpperCase()]);
  if (meta.urlStatus) metaRows.push(["URL status", String(meta.urlStatus).toUpperCase()]);
  if (sel.city || sel.country)
    metaRows.push(["Location", [sel.city, sel.country].filter(Boolean).join(", ")]);

  return (
    <div className="pointer-events-auto absolute bottom-44 left-1/2 z-20 w-[26rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 animate-panel-in rounded-2xl border border-white/10 bg-void/90 shadow-[0_0_40px_-10px] shadow-cyan-500/30 backdrop-blur-xl max-lg:static max-lg:mt-4 max-lg:w-full max-lg:translate-x-0">
      <header className="flex items-start gap-2.5 border-b border-white/[0.06] px-4 py-3">
        <SeverityBadge severity={sel.severity} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-snug text-slate-100">{sel.title}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {SOURCE_LABEL[sel.source ?? ""] ?? sel.source}
            {sel.occurredAt && ` · ${timeAgo(sel.occurredAt)}`}
          </p>
        </div>
        <button
          onClick={() => selectGlobeEvent(null)}
          className="shrink-0 rounded px-1.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200"
          aria-label="Close"
        >
          ✕
        </button>
      </header>

      <div className="max-h-72 overflow-y-auto px-4 py-3">
        {sel.ip && (
          <div className="mb-2.5 flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-neon">{sel.ip}</span>
            {intel?.found && intel.tags?.map((t) => (
              <span
                key={t}
                className="rounded border border-pulse/40 bg-pulse/10 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-pulse"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {metaRows.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {metaRows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  {k}
                </dt>
                <dd className="truncate text-right font-mono text-[11px] text-slate-300">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {sel.ip && intel?.found && (
          <div className="mt-3 border-t border-white/[0.06] pt-3">
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Exposure <span className="text-slate-600">(Shodan InternetDB)</span>
            </p>
            {intel.ports && intel.ports.length > 0 && (
              <p className="font-mono text-[11px] leading-relaxed text-slate-300">
                <span className="text-slate-500">Open ports · </span>
                {intel.ports.join(", ")}
              </p>
            )}
            {intel.hostnames && intel.hostnames.length > 0 && (
              <p className="truncate font-mono text-[11px] text-slate-300">
                <span className="text-slate-500">Hosts · </span>
                {intel.hostnames.join(", ")}
              </p>
            )}
            {intel.vulns && intel.vulns.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {intel.vulns.slice(0, 8).map((v) => (
                  <a
                    key={v}
                    href={`https://nvd.nist.gov/vuln/detail/${v}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-sev-critical/40 bg-sev-critical/10 px-1.5 py-px font-mono text-[10px] text-sev-critical transition-colors hover:bg-sev-critical/25"
                  >
                    {v}
                  </a>
                ))}
                {intel.vulns.length > 8 && (
                  <span className="px-1 font-mono text-[10px] text-slate-500">
                    +{intel.vulns.length - 8} more
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        {sel.ip && intel && !intel.found && (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-600">
            No InternetDB exposure data for this IP
          </p>
        )}
      </div>

      {sel.ip && (
        <footer className="flex gap-1.5 border-t border-white/[0.06] px-4 py-2.5">
          {PIVOTS.map(([name, url]) => (
            <a
              key={name}
              href={url(sel.ip!)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400 transition-colors hover:border-neon/40 hover:text-neon"
            >
              {name} ↗
            </a>
          ))}
        </footer>
      )}
    </div>
  );
}
