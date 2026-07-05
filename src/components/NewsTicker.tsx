"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher, SOURCE_LABEL, timeAgo } from "@/lib/format";
import SeverityBadge from "./SeverityBadge";

interface Article {
  id: number;
  title: string;
  severity: string;
  source: string;
  occurredAt: string;
  metadata: { link?: string; industry?: string | null } | null;
}

/** Rotating breaking-news headline strip; click opens the source article. */
export default function NewsTicker() {
  const { data } = useSWR<{ articles: Article[] }>("/api/news?limit=20", fetcher, {
    refreshInterval: 15 * 60 * 1000,
    keepPreviousData: true,
  });
  const [idx, setIdx] = useState(0);
  const articles = data?.articles ?? [];

  useEffect(() => {
    if (articles.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % articles.length), 7_000);
    return () => clearInterval(t);
  }, [articles.length]);

  if (articles.length === 0) return null;
  const a = articles[idx % articles.length];
  const link = a.metadata?.link;

  return (
    <button
      onClick={() => link && window.open(link, "_blank", "noopener,noreferrer")}
      title={link ? "Read full article" : undefined}
      className="pointer-events-auto mx-2 mb-2 flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-left backdrop-blur-xl transition-colors hover:bg-white/[0.06]"
    >
      <span className="shrink-0 font-mono text-[9px] font-semibold uppercase tracking-widest text-neon">
        Breaking
      </span>
      <SeverityBadge severity={a.severity} />
      <span key={a.id} className="min-w-0 flex-1 animate-feed-in truncate font-mono text-[11px] text-slate-300">
        {a.title}
      </span>
      <span className="hidden shrink-0 font-mono text-[9px] uppercase tracking-wider text-slate-600 sm:inline">
        {SOURCE_LABEL[a.source] ?? a.source} · {timeAgo(a.occurredAt)}
      </span>
    </button>
  );
}
