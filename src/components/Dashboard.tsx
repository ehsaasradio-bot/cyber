"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { focusGlobe, selectGlobeEvent } from "@/lib/globeBus";
import GlassPanel from "./GlassPanel";
import GlobePanel from "./GlobePanel";
import FlatMap from "./FlatMap";
import CriticalWatcher from "./CriticalWatcher";
import StormOverlay from "./StormOverlay";
import HeatLegend from "./HeatLegend";
import ThreatFeed from "./ThreatFeed";
import TopCves from "./TopCves";
import Timeline from "./Timeline";
import StatChips from "./StatChips";
import AlertTicker from "./AlertTicker";
import ViewSelect, { type GlobeView } from "./ViewSelect";
import IndustrySelect from "./IndustrySelect";
import EventDetail from "./EventDetail";
import ForecastStrip from "./ForecastStrip";
import BriefingBanner from "./BriefingBanner";
import NewsTicker from "./NewsTicker";
import { ReplayHud, useReplay } from "./ReplayControl";

type Win = "24h" | "7d";

export default function Dashboard() {
  const [win, setWin] = useState<Win>("24h");
  const [view, setView] = useState<GlobeView>("all");
  const [industry, setIndustry] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<"globe" | "flat">("globe");
  const [storm, setStorm] = useState(false);
  const replay = useReplay();

  // Deep link from /trends or /industry: /?country=NL or /?industry=SLUG flies
  // the globe to the top matching event once the globe has mounted.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const country = params.get("country");
    const industryParam = params.get("industry");
    if ((!country || !/^[A-Za-z]{2}$/.test(country)) && !industryParam) return;
    setWin("7d");
    if (industryParam) setIndustry(industryParam);
    let cancelled = false;
    (async () => {
      const qs = new URLSearchParams({ window: "7d", view: "all" });
      if (industryParam) qs.set("industry", industryParam);
      const res = await fetch(`/api/globe?${qs}`);
      if (!res.ok) return;
      const { points } = (await res.json()) as {
        points: {
          lat: number; lng: number; title: string; severity: string; type: string;
          source: string; country: string | null; city: string | null;
          ip: string | null; occurredAt: string; metadata: Record<string, unknown> | null;
        }[];
      };
      const target = country
        ? points.find((p) => p.country === country.toUpperCase())
        : points[0];
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
    <div className="relative h-screen w-full overflow-hidden max-lg:h-auto max-lg:overflow-visible">
      <CriticalWatcher />
      <div className="absolute inset-0 z-0 max-lg:relative max-lg:h-[50vh]">
        {mapMode === "globe" ? (
          <GlobePanel window={win} view={view} industry={industry} overridePoints={replay.points} />
        ) : (
          <FlatMap window={win} view={view} industry={industry} overridePoints={replay.points} />
        )}
        <StormOverlay active={storm} />
        {view === "heat" && <HeatLegend />}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col p-4 max-lg:relative max-lg:inset-auto">
        <Header
          viewSelect={<ViewSelect view={view} onChange={setView} />}
          industrySelect={<IndustrySelect industry={industry} onChange={setIndustry} />}
          mapModeToggle={
            <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-0.5 backdrop-blur-xl">
              {(["globe", "flat"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMapMode(m)}
                  className={`rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                    mapMode === m
                      ? "bg-neon/15 text-neon"
                      : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                  }`}
                >
                  {m === "globe" ? "🌐 Globe" : "🗺 Flat"}
                </button>
              ))}
            </div>
          }
          stormToggle={
            <button
              onClick={() => setStorm((s) => !s)}
              title="Ambient storm view: rain intensity follows the live index, lightning flashes on new critical events"
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider backdrop-blur-xl transition-colors ${
                storm
                  ? "border-sev-medium/40 bg-sev-medium/[0.1] text-sev-medium"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-sev-medium/40 hover:text-sev-medium"
              }`}
            >
              ⛈ Storm
            </button>
          }
          replayButton={
            !replay.active ? (
              <button
                onClick={replay.start}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 backdrop-blur-xl transition-colors hover:border-pulse/40 hover:text-pulse"
                title="Replay the last 30 days on the globe"
              >
                ▶ Replay
              </button>
            ) : null
          }
        />
        <ForecastStrip />
        <BriefingBanner />
        <NewsTicker />
        <ReplayHud replay={replay} />
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

function Header({
  viewSelect,
  industrySelect,
  mapModeToggle,
  stormToggle,
  replayButton,
}: {
  viewSelect: React.ReactNode;
  industrySelect: React.ReactNode;
  mapModeToggle: React.ReactNode;
  stormToggle: React.ReactNode;
  replayButton?: React.ReactNode;
}) {
  return (
    <header className="pointer-events-auto relative z-20 flex animate-panel-in flex-wrap items-center gap-x-4 gap-y-2 px-2 pb-3">
      <h1 className="font-mono text-lg font-semibold tracking-[0.35em] text-white">
        CYBER<span className="text-neon">WEATHER</span>
      </h1>
      <span className="rounded-full border border-neon/30 bg-neon/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neon">
        Live
      </span>
      {mapModeToggle}
      {viewSelect}
      {industrySelect}
      <Link
        href="/industry"
        className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 backdrop-blur-xl transition-colors hover:border-neon/40 hover:text-neon xl:flex"
      >
        Industries
      </Link>
      <Link
        href="/attack-techniques"
        className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 backdrop-blur-xl transition-colors hover:border-neon/40 hover:text-neon xl:flex"
      >
        ATT&amp;CK
      </Link>
      <Link
        href="/trends"
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 backdrop-blur-xl transition-colors hover:border-neon/40 hover:text-neon"
      >
        Trends ↗
      </Link>
      <Link
        href="/my"
        title="My Weather — personalized exposure"
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 backdrop-blur-xl transition-colors hover:border-pulse/40 hover:text-pulse"
      >
        My
      </Link>
      {replayButton}
      {stormToggle}
      <div className="min-w-0 flex-1 overflow-hidden px-3 max-lg:hidden">
        <AlertTicker />
      </div>
      <StatChips />
    </header>
  );
}
