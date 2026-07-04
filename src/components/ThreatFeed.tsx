"use client";

import useSWR from "swr";
import SeverityBadge from "./SeverityBadge";
import { fetcher, SOURCE_LABEL, timeAgo } from "@/lib/format";

interface FeedEvent {
  id: number;
  type: string;
  source: string;
  title: string;
  severity: string;
  occurredAt: string;
  country: string | null;
}

const BORDER: Record<string, string> = {
  critical: "border-l-sev-critical",
  high: "border-l-sev-high",
  medium: "border-l-sev-medium",
  low: "border-l-sev-low",
};

export default function ThreatFeed() {
  const { data, isLoading } = useSWR<{ events: FeedEvent[] }>(
    "/api/feed?limit=50",
    fetcher,
    { refreshInterval: 30_000, keepPreviousData: true },
  );

  if (isLoading && !data) return <FeedSkeleton />;
  if (!data?.events.length) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center font-mono text-xs uppercase leading-relaxed tracking-widest text-slate-500">
        Awaiting signal —<br />
        run `npm run ingest`
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/[0.04]">
      {data.events.map((e) => (
        <li
          key={e.id}
          className={`animate-feed-in border-l-2 px-3 py-2.5 ${BORDER[e.severity] ?? BORDER.low} hover:bg-white/[0.03]`}
        >
          <p className="text-[13px] leading-snug text-slate-200">{e.title}</p>
          <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] text-slate-500">
            <SeverityBadge severity={e.severity} />
            <span className="uppercase tracking-wider">
              {SOURCE_LABEL[e.source] ?? e.source}
            </span>
            {e.country && <span>{e.country}</span>}
            <span className="ml-auto">{timeAgo(e.occurredAt)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3 p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-2">
          <div className="h-3 w-11/12 rounded bg-white/[0.06]" />
          <div className="h-2.5 w-2/3 rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}
