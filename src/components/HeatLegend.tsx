"use client";

const STEPS: [string, string][] = [
  ["rgba(244,63,94,0.06)", "Quiet"],
  ["rgba(244,63,94,0.22)", "Elevated"],
  ["rgba(244,63,94,0.4)", "High"],
  ["rgba(244,63,94,0.58)", "Severe"],
];

/** Legend for the country-risk-heat view — log-scaled event density per country. */
export default function HeatLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-void/80 px-3 py-2 backdrop-blur-xl">
      <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
        Event density
      </span>
      {STEPS.map(([color, label]) => (
        <div key={label} className="flex items-center gap-1">
          <span className="size-2.5 rounded-sm border border-white/10" style={{ background: color }} />
          <span className="font-mono text-[9px] text-slate-400">{label}</span>
        </div>
      ))}
    </div>
  );
}
