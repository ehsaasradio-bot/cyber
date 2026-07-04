"use client";

import { useState } from "react";
import GlassPanel from "./GlassPanel";
import GlobePanel from "./GlobePanel";
import ThreatFeed from "./ThreatFeed";
import TopCves from "./TopCves";
import Timeline from "./Timeline";

type Win = "24h" | "7d";

export default function Dashboard() {
  const [win, setWin] = useState<Win>("24h");

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
        <GlobePanel window={win} />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col p-4 max-lg:relative max-lg:inset-auto">
        <Header />

        <div className="flex min-h-0 flex-1 items-stretch justify-between gap-4 max-lg:flex-col">
          <GlassPanel title="Threat Feed" className="pointer-events-auto w-80 xl:w-96 max-lg:h-80 max-lg:w-full">
            <ThreatFeed />
          </GlassPanel>
          <div className="flex-1 max-lg:hidden" />
          <GlassPanel title="Top CVEs" className="pointer-events-auto w-80 xl:w-96 max-lg:h-80 max-lg:w-full">
            <TopCves />
          </GlassPanel>
        </div>

        <GlassPanel
          title="Event Timeline"
          action={toggle}
          className="pointer-events-auto mt-4 h-36 shrink-0"
        >
          <Timeline window={win} />
        </GlassPanel>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="pointer-events-auto flex items-center gap-4 px-2 pb-3">
      <h1 className="font-mono text-lg font-semibold tracking-[0.35em] text-white">
        CYBER<span className="text-neon">WEATHER</span>
      </h1>
      <span className="rounded-full border border-neon/30 bg-neon/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neon">
        Live
      </span>
    </header>
  );
}
