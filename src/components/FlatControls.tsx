"use client";

import { REGION_LABELS } from "@/lib/regions";

export interface FlatControlsProps {
  preset: string | null;
  expanded: boolean;
  onJump: (code: string | null) => void;
  onZoom: (factor: number) => void;
  onToggleFullscreen: () => void;
}

const BTN =
  "rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors";
const active = "border-neon/40 bg-neon/10 text-neon";
const idle = "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200";

/** The flat-map control bar (continent presets + zoom + full-screen). Rendered
 * in the overlay flow so it sits below the header — and again inside the map's
 * own fixed layer when full-screen. */
export default function FlatControls({
  preset,
  expanded,
  onJump,
  onZoom,
  onToggleFullscreen,
}: FlatControlsProps) {
  return (
    <div className="pointer-events-auto flex w-fit max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-void/70 px-2 py-1.5 backdrop-blur-xl">
      <button onClick={() => onJump(null)} className={`${BTN} ${preset === "world" ? active : idle}`}>
        World
      </button>
      {Object.entries(REGION_LABELS).map(([code, label]) => (
        <button
          key={code}
          onClick={() => onJump(code)}
          className={`${BTN} ${preset === code ? active : idle}`}
        >
          {label}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-1 pl-1">
        <button
          onClick={() => onZoom(1 / 1.4)}
          title="Zoom in"
          className="size-6 rounded border border-white/10 bg-white/[0.03] font-mono text-sm leading-none text-slate-300 hover:border-neon/40 hover:text-neon"
        >
          +
        </button>
        <button
          onClick={() => onZoom(1.4)}
          title="Zoom out"
          className="size-6 rounded border border-white/10 bg-white/[0.03] font-mono text-sm leading-none text-slate-300 hover:border-neon/40 hover:text-neon"
        >
          −
        </button>
        <button
          onClick={onToggleFullscreen}
          title={expanded ? "Exit full screen (Esc)" : "Full screen map"}
          className={`size-6 rounded border font-mono text-xs leading-none transition-colors ${
            expanded
              ? "border-neon/40 bg-neon/10 text-neon"
              : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-neon/40 hover:text-neon"
          }`}
        >
          {expanded ? "✕" : "⛶"}
        </button>
      </div>
    </div>
  );
}
