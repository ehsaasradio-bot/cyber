"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher, slugify } from "@/lib/format";
import GlassPanel from "./GlassPanel";
import SeverityBadge from "./SeverityBadge";

interface Profile {
  vendors: string[];
  sector: string | null;
  watch: string[];
}

interface WatchHit {
  term: string;
  cveHits: { cveId: string; vendor: string | null; product: string | null; priorityScore: number }[];
  newsHits: { id: number; title: string; occurredAt: string; link: string | null }[];
  eventHits: { id: number; title: string; type: string; occurredAt: string }[];
  total: number;
}

const WATCH_SUGGESTIONS = [
  "Kubernetes", "Docker", "Microservices", "S3 Bucket", "BigQuery",
  "OCI", "GCP", "Azure", "Alibaba Cloud", "Mambu", "SWIFT", "Thunes",
  "Cryptocurrency", "Quantum Encryption",
];

interface VendorOption {
  name: string;
  kevCount: number;
}

interface ProfileCve {
  cveId: string;
  vendor: string;
  product: string | null;
  cvss: number | null;
  epss: number | null;
  isKev: boolean;
  ransomware: boolean;
  score: number;
}

interface IndexEntry {
  key: string;
  label: string;
  score: number;
  level: string;
  outlook: string;
}

const STORAGE_KEY = "cw-profile";

function loadProfile(): Profile {
  const empty: Profile = { vendors: [], sector: null, watch: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Spread over defaults so profiles saved before `watch` existed still work.
    if (raw) return { ...empty, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    /* fresh profile */
  }
  return empty;
}

export default function MyWeather() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setEditing(p.vendors.length === 0 && p.watch.length === 0);
  }, []);

  const save = (p: Profile) => {
    setProfile(p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  };

  const { data: vendorData } = useSWR<{ vendors: VendorOption[] }>(
    "/api/profile/vendors",
    fetcher,
  );
  const { data: sectorData } = useSWR<{ sectors: { name: string }[] }>(
    "/api/trends/sectors",
    fetcher,
  );
  const { data: cveData } = useSWR<{ cves: ProfileCve[]; patchNow: number }>(
    profile && profile.vendors.length > 0
      ? `/api/profile/cves?vendors=${encodeURIComponent(profile.vendors.join(","))}`
      : null,
    fetcher,
    { refreshInterval: 300_000, keepPreviousData: true },
  );
  const { data: idx } = useSWR<{ sectors: IndexEntry[] }>("/api/index", fetcher);
  const { data: watchData } = useSWR<{ results: WatchHit[] }>(
    profile && profile.watch.length > 0
      ? `/api/profile/watch?terms=${encodeURIComponent(profile.watch.join(","))}`
      : null,
    fetcher,
    { refreshInterval: 300_000, keepPreviousData: true },
  );

  if (!profile) return null;

  const sectorEntry = profile.sector
    ? idx?.sectors.find((s) => s.key === profile.sector)
    : null;

  if (editing) {
    return (
      <SetupForm
        vendors={vendorData?.vendors ?? []}
        sectors={sectorData?.sectors.map((s) => s.name) ?? []}
        initial={profile}
        onSave={(p) => {
          save(p);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {profile.vendors.map((v) => (
          <span
            key={v}
            className="rounded border border-neon/30 bg-neon/[0.08] px-2 py-1 font-mono text-[11px] text-neon"
          >
            {v}
          </span>
        ))}
        {profile.sector && (
          <Link
            href={`/sector/${slugify(profile.sector)}`}
            className="rounded border border-pulse/30 bg-pulse/[0.08] px-2 py-1 font-mono text-[11px] text-pulse hover:bg-pulse/[0.18]"
          >
            {profile.sector}
          </Link>
        )}
        {profile.watch.map((w) => (
          <span
            key={w}
            className="rounded border border-sev-medium/30 bg-sev-medium/[0.08] px-2 py-1 font-mono text-[11px] text-sev-medium"
          >
            👁 {w}
          </span>
        ))}
        <button
          onClick={() => setEditing(true)}
          className="ml-auto rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400 transition-colors hover:border-neon/40 hover:text-neon"
        >
          Edit stack
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
            Patch now
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-sev-critical">
            {cveData?.patchNow ?? "—"}
          </p>
          <p className="font-mono text-[9px] text-slate-500">KEV + EPSS ≥ 30% in your stack</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
            Tracked exposure
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-neon">
            {cveData?.cves.length ?? "—"}
          </p>
          <p className="font-mono text-[9px] text-slate-500">top CVEs across your vendors</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
            Sector pressure
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-sev-high">
            {sectorEntry ? `${sectorEntry.score} · ${sectorEntry.level}` : "—"}
          </p>
          <p className="font-mono text-[9px] text-slate-500">
            {sectorEntry ? `${sectorEntry.label} · ${sectorEntry.outlook}` : "pick a sector to track"}
          </p>
        </div>
      </div>

      {profile.watch.length > 0 && (
        <GlassPanel title="Watchlist · live matches" className="max-h-[30rem]">
          {!watchData ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-white/[0.06]" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {watchData.results.map((r) => (
                <div key={r.term} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] font-semibold text-sev-medium">
                      {r.term}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      {r.total} match{r.total === 1 ? "" : "es"}
                    </span>
                  </div>
                  {r.total === 0 ? (
                    <p className="mt-1 font-mono text-[11px] text-slate-600">
                      Nothing tracked yet — quiet for now
                    </p>
                  ) : (
                    <div className="mt-1.5 flex flex-col gap-1">
                      {r.cveHits.map((c) => (
                        <Link
                          key={c.cveId}
                          href={`/cve/${c.cveId}`}
                          className="flex items-center gap-2 font-mono text-[11px] text-slate-400 hover:text-neon"
                        >
                          <span className="text-neon">{c.cveId}</span>
                          <span className="truncate text-slate-500">
                            {[c.vendor, c.product].filter(Boolean).join(" · ")}
                          </span>
                        </Link>
                      ))}
                      {r.newsHits.map((n) => (
                        <a
                          key={`news-${n.id}`}
                          href={n.link ?? undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate font-mono text-[11px] text-slate-400 hover:text-neon"
                        >
                          📰 {n.title}
                        </a>
                      ))}
                      {r.eventHits.map((e) => (
                        <span
                          key={`ev-${e.id}`}
                          className="truncate font-mono text-[11px] text-slate-400"
                        >
                          ⚠ {e.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      )}

      <GlassPanel title="Your exposure · ranked" className="max-h-[30rem]">
        {!cveData ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-white/[0.06]" />
            ))}
          </div>
        ) : cveData.cves.length === 0 ? (
          <div className="flex h-32 items-center justify-center p-6 text-center font-mono text-xs uppercase leading-relaxed tracking-widest text-slate-500">
            No tracked CVEs for this stack —<br />
            your vendors look quiet
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {cveData.cves.map((c) => (
              <li key={c.cveId}>
                <Link
                  href={`/cve/${c.cveId}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
                >
                  <span className="w-40 shrink-0 font-mono text-[13px] font-medium text-neon">
                    {c.cveId}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-400">
                    {[c.vendor, c.product].filter(Boolean).join(" · ")}
                  </span>
                  {c.isKev && (
                    <span className="shrink-0 rounded border border-sev-high/40 bg-sev-high/10 px-1.5 py-px font-mono text-[9px] uppercase text-sev-high">
                      KEV
                    </span>
                  )}
                  {c.ransomware && (
                    <span className="shrink-0 rounded border border-sev-critical/40 bg-sev-critical/10 px-1.5 py-px font-mono text-[9px] uppercase text-sev-critical">
                      RW
                    </span>
                  )}
                  <span className="w-12 shrink-0 text-right font-mono text-[13px] font-semibold text-slate-100">
                    {c.score.toFixed(1)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
  );
}

function SetupForm({
  vendors,
  sectors,
  initial,
  onSave,
}: {
  vendors: VendorOption[];
  sectors: string[];
  initial: Profile;
  onSave: (p: Profile) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.vendors));
  const [sector, setSector] = useState<string | null>(initial.sector);
  const [watch, setWatch] = useState<string[]>(initial.watch);
  const [watchInput, setWatchInput] = useState("");

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const addWatch = (term: string) => {
    const t = term.trim();
    if (!t || t.length > 40 || watch.length >= 15 || watch.includes(t)) return;
    setWatch((w) => [...w, t]);
    setWatchInput("");
  };
  const removeWatch = (term: string) => setWatch((w) => w.filter((t) => t !== term));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      <h2 className="font-mono text-sm uppercase tracking-widest text-slate-200">
        Build your stack
      </h2>
      <p className="mt-1 text-[12px] text-slate-500">
        Pick the vendors you run and your industry — CyberWeather personalizes exposure and
        pressure to your world. Stored locally in your browser.
      </p>

      <p className="mt-5 mb-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">
        Vendors ({selected.size} selected)
      </p>
      <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto pr-1">
        {vendors.length === 0 && (
          <span className="font-mono text-[11px] text-slate-500">Loading vendors…</span>
        )}
        {vendors.map((v) => {
          const on = selected.has(v.name);
          return (
            <button
              key={v.name}
              onClick={() => toggle(v.name)}
              className={`rounded border px-2 py-1 font-mono text-[11px] transition-colors ${
                on
                  ? "border-neon/50 bg-neon/15 text-neon"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-slate-200"
              }`}
            >
              {v.name} <span className="opacity-60">{v.kevCount}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-5 mb-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">
        Your sector (optional)
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sectors.slice(0, 14).map((s) => (
          <button
            key={s}
            onClick={() => setSector(sector === s ? null : s)}
            className={`rounded border px-2 py-1 font-mono text-[11px] transition-colors ${
              sector === s
                ? "border-pulse/50 bg-pulse/15 text-pulse"
                : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <p className="mt-5 mb-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">
        Watch any technology ({watch.length}/15) — Kubernetes, Mambu, SWIFT, S3, quantum
        encryption, anything
      </p>
      <div className="flex flex-wrap gap-1.5">
        {watch.map((t) => (
          <button
            key={t}
            onClick={() => removeWatch(t)}
            title="Remove"
            className="rounded border border-sev-medium/40 bg-sev-medium/15 px-2 py-1 font-mono text-[11px] text-sev-medium hover:bg-sev-medium/25"
          >
            {t} ✕
          </button>
        ))}
        <input
          value={watchInput}
          onChange={(e) => setWatchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addWatch(watchInput);
            }
          }}
          placeholder="Type and press Enter…"
          maxLength={40}
          className="min-w-[10rem] flex-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-sev-medium/40 focus:outline-none"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {WATCH_SUGGESTIONS.filter((s) => !watch.includes(s)).map((s) => (
          <button
            key={s}
            onClick={() => addWatch(s)}
            className="rounded border border-white/10 bg-white/[0.02] px-2 py-0.5 font-mono text-[10px] text-slate-500 transition-colors hover:border-sev-medium/40 hover:text-sev-medium"
          >
            + {s}
          </button>
        ))}
      </div>

      <button
        onClick={() => onSave({ vendors: [...selected], sector, watch })}
        disabled={selected.size === 0 && watch.length === 0}
        className="mt-6 rounded-lg border border-neon/40 bg-neon/15 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-neon transition-colors hover:bg-neon/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Save my weather
      </button>
    </div>
  );
}
