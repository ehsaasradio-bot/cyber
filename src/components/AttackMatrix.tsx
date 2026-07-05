"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/format";
import { TACTICS, TECHNIQUES, type Technique } from "@/lib/mitreAttack";

const HEAT_STEPS = [
  "bg-white/[0.03] border-white/10 text-slate-500",
  "bg-neon/[0.06] border-neon/20 text-slate-300",
  "bg-sev-medium/[0.10] border-sev-medium/30 text-sev-medium",
  "bg-sev-high/[0.12] border-sev-high/40 text-sev-high",
  "bg-sev-critical/[0.14] border-sev-critical/50 text-sev-critical",
];

function heatClass(n: number, max: number): string {
  if (n === 0 || max === 0) return HEAT_STEPS[0];
  const t = n / max;
  if (t > 0.66) return HEAT_STEPS[4];
  if (t > 0.4) return HEAT_STEPS[3];
  if (t > 0.15) return HEAT_STEPS[2];
  return HEAT_STEPS[1];
}

export default function AttackMatrix() {
  const { data } = useSWR<{ counts: Record<string, number> }>(
    "/api/attack-techniques/counts",
    fetcher,
    { refreshInterval: 300_000 },
  );
  const [selected, setSelected] = useState<Technique | null>(null);
  const counts = data?.counts ?? {};
  const max = Math.max(1, ...Object.values(counts));

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
        <div className="flex min-w-max gap-2">
          {TACTICS.map((tactic) => {
            const techniques = TECHNIQUES.filter((t) => t.tactic === tactic.id);
            if (techniques.length === 0) return null;
            return (
              <div key={tactic.id} className="w-40 shrink-0">
                <p
                  className="mb-1.5 truncate font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-300"
                  title={tactic.description}
                >
                  {tactic.name}
                </p>
                <div className="flex flex-col gap-1">
                  {techniques.map((t) => {
                    const n = counts[t.id] ?? 0;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelected(t)}
                        title={`${t.id} — ${t.name}`}
                        className={`rounded border px-2 py-1.5 text-left font-mono text-[10px] leading-tight transition-colors hover:brightness-125 ${heatClass(n, max)} ${
                          selected?.id === t.id ? "ring-1 ring-white/40" : ""
                        }`}
                      >
                        <span className="block truncate">{t.name}</span>
                        <span className="mt-0.5 block text-[9px] opacity-70">
                          {t.id}
                          {n > 0 ? ` · ${n}` : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl lg:w-72">
        {selected ? (
          <>
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              {TACTICS.find((t) => t.id === selected.tactic)?.name}
            </p>
            <h2 className="mt-1 font-mono text-sm font-semibold text-slate-100">
              {selected.id} · {selected.name}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
              {selected.description}
            </p>
            <p className="mt-3 font-mono text-[11px] text-slate-500">
              {(counts[selected.id] ?? 0).toLocaleString()} related events · last 30 days
            </p>
            <a
              href={`https://attack.mitre.org/techniques/${selected.id}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400 transition-colors hover:border-neon/40 hover:text-neon"
            >
              MITRE ATT&CK ↗
            </a>
          </>
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
            Click a technique to see details
          </p>
        )}
      </div>
    </div>
  );
}
