"use client";

import { useEffect, useRef, useState } from "react";

export type GlobeView = "all" | "c2" | "attack" | "malware" | "heat";

const VIEWS: { key: GlobeView; label: string; hint: string }[] = [
  { key: "all", label: "All threats", hint: "Every geolocated event + attack arcs" },
  { key: "c2", label: "Botnet C2", hint: "Command & control servers (Feodo)" },
  { key: "attack", label: "Attack sources", hint: "Mass scanners & attackers (DShield)" },
  { key: "malware", label: "Malware hosts", hint: "Malware distribution URLs (URLhaus)" },
  { key: "heat", label: "Country risk heat", hint: "Choropleth of event density by country" },
];

export default function ViewSelect({
  view,
  onChange,
}: {
  view: GlobeView;
  onChange: (v: GlobeView) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const current = VIEWS.find((v) => v.key === view) ?? VIEWS[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 backdrop-blur-xl transition-colors hover:border-neon/40 hover:text-neon"
      >
        <span className="text-slate-500">View</span>
        {current.label}
        <span className={`text-[9px] transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-72 overflow-hidden rounded-xl border border-white/10 bg-void/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => {
                onChange(v.key);
                setOpen(false);
              }}
              className={`block w-full px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.06] ${
                v.key === view ? "bg-neon/[0.08]" : ""
              }`}
            >
              <span
                className={`font-mono text-[11px] uppercase tracking-wider ${
                  v.key === view ? "text-neon" : "text-slate-200"
                }`}
              >
                {v.label}
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-500">{v.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
