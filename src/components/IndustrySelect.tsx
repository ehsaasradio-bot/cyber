"use client";

import { useEffect, useRef, useState } from "react";
import { INDUSTRIES } from "@/lib/industries";

export default function IndustrySelect({
  industry,
  onChange,
}: {
  industry: string | null;
  onChange: (slug: string | null) => void;
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

  const current = INDUSTRIES.find((i) => i.slug === industry);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider backdrop-blur-xl transition-colors ${
          current
            ? "border-pulse/40 bg-pulse/[0.08] text-pulse"
            : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-pulse/40 hover:text-pulse"
        }`}
      >
        <span className={current ? "text-pulse/70" : "text-slate-500"}>Industry</span>
        {current ? current.label : "All"}
        <span className={`text-[9px] transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-white/10 bg-void/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`block w-full px-3.5 py-2.5 text-left font-mono text-[11px] uppercase tracking-wider transition-colors hover:bg-white/[0.06] ${
              !industry ? "bg-pulse/[0.08] text-pulse" : "text-slate-300"
            }`}
          >
            All industries
          </button>
          {INDUSTRIES.map((ind) => (
            <button
              key={ind.slug}
              onClick={() => {
                onChange(ind.slug);
                setOpen(false);
              }}
              className={`block w-full px-3.5 py-2.5 text-left font-mono text-[11px] uppercase tracking-wider transition-colors hover:bg-white/[0.06] ${
                industry === ind.slug ? "bg-pulse/[0.08] text-pulse" : "text-slate-300"
              }`}
            >
              {ind.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
