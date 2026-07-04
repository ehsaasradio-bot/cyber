"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher, timeAgo } from "@/lib/format";
import { focusGlobe } from "@/lib/globeBus";

interface FeedEvent {
  id: number;
  type: string;
  title: string;
  severity: string;
  occurredAt: string;
  lat: number | null;
  lon: number | null;
  metadata: { cveId?: string } | null;
}

const TYPE_TAG: Record<string, string> = {
  kev_added: "ACTIVELY EXPLOITED",
  c2_server: "LIVE BOTNET C2",
  cve_critical: "CRITICAL CVE",
  attack_source: "MASS ATTACK",
  malware_url: "MALWARE HOST",
  ransomware_victim: "RANSOMWARE HIT",
};

/** Rotating spotlight on breach-grade activity: critical events from the last feed pull. */
export default function AlertTicker() {
  const { data } = useSWR<{ events: FeedEvent[] }>(
    "/api/feed?limit=8&severity=critical",
    fetcher,
    { refreshInterval: 30_000, keepPreviousData: true },
  );
  const [idx, setIdx] = useState(0);

  const alerts = data?.events ?? [];

  useEffect(() => {
    if (alerts.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % alerts.length), 6_000);
    return () => clearInterval(t);
  }, [alerts.length]);

  if (!alerts.length) return null;
  const alert = alerts[idx % alerts.length];

  const activate = () => {
    if (alert.lat != null && alert.lon != null) {
      focusGlobe({ lat: alert.lat, lng: alert.lon, label: alert.title, severity: "critical" });
    } else if (alert.metadata?.cveId) {
      window.location.href = `/cve/${alert.metadata.cveId}`;
    }
  };

  return (
    <button
      onClick={activate}
      className="group flex min-w-0 items-center gap-2.5 rounded-lg border border-sev-critical/40 bg-sev-critical/[0.08] px-3 py-1.5 shadow-[0_0_24px_-8px] shadow-sev-critical/50 backdrop-blur-xl transition-colors hover:bg-sev-critical/[0.15]"
      title={alert.lat != null ? "Locate on globe" : "Open details"}
    >
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sev-critical opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-sev-critical" />
      </span>
      <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-widest text-sev-critical">
        {TYPE_TAG[alert.type] ?? "CRITICAL"}
      </span>
      <span
        key={alert.id}
        className="animate-feed-in truncate font-mono text-[11px] text-slate-300"
      >
        {alert.title}
      </span>
      <span className="ml-1 shrink-0 font-mono text-[10px] text-slate-500">
        {timeAgo(alert.occurredAt)}
      </span>
    </button>
  );
}
