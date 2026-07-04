"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/format";

export interface ReplayEvent {
  ts: string;
  lat: number;
  lng: number;
  severity: string;
  type: string;
  source: string;
  title: string;
  country: string | null;
}

const DAYS = 30;
const STEP_MS = 6 * 3600_000; // cursor advance per tick (6h)
const TICK_MS = 160;
const TRAIL_MS = 72 * 3600_000; // events stay visible for 72h of replay time

const SIZE: Record<string, number> = { critical: 1.0, high: 0.7, medium: 0.45, low: 0.3 };

export function useReplay() {
  const [state, setState] = useState<{ playing: boolean; cursor: number } | null>(null);
  const { data } = useSWR<{ events: ReplayEvent[] }>(
    state ? `/api/replay?days=${DAYS}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (!state?.playing || !data) return;
    const t = setInterval(() => {
      setState((s) => {
        if (!s) return s;
        const next = s.cursor + STEP_MS;
        if (next >= Date.now()) return { playing: false, cursor: Date.now() };
        return { ...s, cursor: next };
      });
    }, TICK_MS);
    return () => clearInterval(t);
  }, [state?.playing, data]);

  const points = useMemo(() => {
    if (!state || !data) return null;
    const from = state.cursor - TRAIL_MS;
    return data.events
      .filter((e) => {
        const t = new Date(e.ts).getTime();
        return t >= from && t <= state.cursor;
      })
      .slice(-400)
      .map((e, i) => ({
        id: `replay-${i}`,
        lat: e.lat,
        lng: e.lng,
        size: SIZE[e.severity] ?? 0.3,
        severity: e.severity,
        type: e.type,
        source: e.source,
        title: e.title,
        label: `${e.title}${e.country ? ` · ${e.country}` : ""}`,
        occurredAt: e.ts,
        country: e.country,
        city: null,
        ip: null,
        metadata: null,
      }));
  }, [state, data]);

  return {
    active: !!state,
    playing: state?.playing ?? false,
    cursor: state?.cursor ?? 0,
    loading: !!state && !data,
    points,
    start: () =>
      setState({ playing: true, cursor: Date.now() - DAYS * 86_400_000 }),
    toggle: () => setState((s) => (s ? { ...s, playing: !s.playing } : s)),
    seek: (fraction: number) =>
      setState((s) =>
        s
          ? {
              ...s,
              cursor:
                Date.now() - DAYS * 86_400_000 + fraction * DAYS * 86_400_000,
            }
          : s,
      ),
    stop: () => setState(null),
  };
}

export function ReplayHud({
  replay,
}: {
  replay: ReturnType<typeof useReplay>;
}) {
  if (!replay.active) return null;
  const start = Date.now() - DAYS * 86_400_000;
  const progress = Math.max(0, Math.min(1, (replay.cursor - start) / (DAYS * 86_400_000)));
  return (
    <div className="pointer-events-auto mx-2 mb-2 flex items-center gap-3 rounded-lg border border-pulse/30 bg-pulse/[0.06] px-3 py-2 backdrop-blur-xl">
      <span className="shrink-0 font-mono text-[9px] font-semibold uppercase tracking-widest text-pulse">
        Replay · 30d
      </span>
      <button
        onClick={replay.toggle}
        className="shrink-0 rounded border border-white/15 px-2 py-0.5 font-mono text-[11px] text-slate-200 hover:bg-white/10"
        title={replay.playing ? "Pause" : "Play"}
      >
        {replay.playing ? "❚❚" : "▶"}
      </button>
      <div
        className="relative h-1.5 min-w-0 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/[0.08]"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          replay.seek((e.clientX - rect.left) / rect.width);
        }}
        title="Seek"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-pulse to-sev-critical"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span className="w-24 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-300">
        {replay.loading
          ? "loading…"
          : new Date(replay.cursor).toISOString().slice(0, 10)}
      </span>
      <button
        onClick={replay.stop}
        className="shrink-0 rounded px-1.5 font-mono text-[11px] text-slate-500 hover:bg-white/10 hover:text-slate-200"
        title="Exit replay"
      >
        ✕
      </button>
    </div>
  );
}
