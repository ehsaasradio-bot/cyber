import GlassPanel from "@/components/GlassPanel";
import GlobePanel from "@/components/GlobePanel";

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0 z-0">
        <GlobePanel window="24h" />
      </div>

      {/* Overlay layer */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col p-4">
        <header className="pointer-events-auto flex items-center gap-4 px-2 pb-3">
          <h1 className="font-mono text-lg font-semibold tracking-[0.35em] text-white">
            CYBER<span className="text-neon">WEATHER</span>
          </h1>
          <span className="rounded-full border border-neon/30 bg-neon/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neon">
            Live
          </span>
        </header>

        <div className="flex min-h-0 flex-1 items-stretch justify-between gap-4">
          <GlassPanel title="Threat Feed" className="pointer-events-auto w-80 xl:w-96">
            <PanelPlaceholder />
          </GlassPanel>
          <div className="flex-1" />
          <GlassPanel title="Top CVEs" className="pointer-events-auto w-80 xl:w-96">
            <PanelPlaceholder />
          </GlassPanel>
        </div>

        <GlassPanel title="Event Timeline" className="pointer-events-auto mt-4 h-32 shrink-0">
          <PanelPlaceholder />
        </GlassPanel>
      </div>
    </main>
  );
}

function PanelPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center p-6 font-mono text-xs uppercase tracking-widest text-slate-500">
      Awaiting signal
    </div>
  );
}
