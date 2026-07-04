"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { focusGlobe, selectGlobeEvent } from "@/lib/globeBus";
import GlassPanel from "./GlassPanel";
import GlobePanel from "./GlobePanel";
import ThreatFeed from "./ThreatFeed";
import TopCves from "./TopCves";
import Timeline from "./Timeline";
import StatChips from "./StatChips";
import AlertTicker from "./AlertTicker";
import ViewSelect, { type GlobeView } from "./ViewSelect";
import EventDetail from "./EventDetail";

type Win = "24h" | "7d";

export default function Dashboard() {
  const [win, setWin] = useState<Win>("24h");
  const [view, setView] = useState<GlobeView>("all");

  // Deep link from /trends: /?country=NL flies the globe to that country's
  // worst recent event once the globe has mounted.
  useEffect(() => {
    const country = new URLSearchParams(window.location.search).get("country");
    if (!country || !/^[A-Za-z]{2}$/.test(country)) return;
    setWin("7d");
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/globe?window=7d&view=all");
      if (!res.ok) return;
      const { points } = (await res.json()) as {
        points: {
          lat: number; lng: number; title: string; severity: string; type: string;
          source: string; country: string | null; city: string | null;
          ip: string | null; occurredAt: string; metadata: Record<string, unknown> | null;
        }[];
      };
      const target = points.find((p) => p.country === country.toUpperCase());
      if (!target || cancelled) return;
      // Globe mounts async (dynamic import + entrance flight) — wait it out
      await new Promise((r) => setTimeout(r, 2_800));
      if (cancelled) return;
      focusGlobe({ lat: target.lat, lng: target.lng, label: target.title, severity: target.severity });
      selectGlobeEvent({
        title: target.title, severity: target.severity, type: target.type,
        source: target.source, ip: target.ip, country: target.country,
        city: target.city, occurredAt: target.occurredAt, metadata: target.metadata,
      });
      window.history.replaceState(null, "", "/");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (
    <div className="flex gap-1">
      {(["24h", "7d"] as Win[]).map((w) => (
        <button
          key={w}
          onClick={() => setWin(w)}
          className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
            win === w
              ? "bg-neon/15 text-neon"
              : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
          }`}
        >
          {w}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden max-lg:h-auto max-lg:overflow-visible">
      <div className="absolute inset-0 z-0 max-lg:relative max-lg:h-[50vh]">
        <GlobePanel window={win} view={view} />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col p-4 max-lg:relative max-lg:inset-auto">
        <Header viewSelect={<ViewSelect view={view} onChange={setView} />} />
        <EventDetail />

        <div className="flex min-h-0 flex-1 items-stretch justify-between gap-4 max-lg:flex-col">
          <GlassPanel
            title="Threat Feed"
            className="pointer-events-auto w-80 animate-panel-in [animation-delay:200ms] xl:w-96 max-lg:h-80 max-lg:w-full"
          >
            <ThreatFeed />
          </GlassPanel>
          <div className="flex-1 max-lg:hidden" />
          <GlassPanel
            title="Top CVEs"
            className="pointer-events-auto w-80 animate-panel-in [animation-delay:350ms] xl:w-96 max-lg:h-80 max-lg:w-full"
          >
            <TopCves />
          </GlassPanel>
        </div>

        <GlassPanel
          title="Event Timeline"
          action={toggle}
          className="pointer-events-auto mt-4 h-36 shrink-0 animate-panel-in [animation-delay:500ms]"
        >
          <Timeline window={win} />
        </GlassPanel>
      </div>
    </div>
  );
}

function Header({ viewSelect }: { viewSelect: React.ReactNode }) {
  return (
    <header className="pointer-events-auto flex animate-panel-in items-center gap-4 px-2 pb-3">
      <h1 className="font-mono text-lg font-semibold tracking-[0.35em] text-white">
        CYBER<span className="text-neon">WEATHER</span>
      </h1>
      <span className="rounded-full border border-neon/30 bg-neon/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neon">
        Live
      </span>
      {viewSelect}
      <Link
        href="/trends"
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 backdrop-blur-xl transition-colors hover:border-neon/40 hover:text-neon"
      >
        Trends ↗
      </Link>
      <div className="min-w-0 flex-1 px-4">
        <AlertTicker />
      </div>
      <StatChips />
    </header>
  );
}
