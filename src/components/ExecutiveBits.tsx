"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function ExecHeader({ chip, children }: { chip: string; children?: ReactNode }) {
  return (
    <header className="flex animate-panel-in flex-wrap items-center gap-4 px-2 py-4">
      <Link
        href="/"
        className="font-mono text-lg font-semibold tracking-[0.35em] text-white transition-opacity hover:opacity-80"
      >
        CYBER<span className="text-neon">WEATHER</span>
      </Link>
      <span className="rounded-full border border-pulse/30 bg-pulse/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-pulse">
        {chip}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2.5">{children}</div>
    </header>
  );
}

export function ExecNavLink({
  href,
  children,
  accent,
}: {
  href: string;
  children: ReactNode;
  accent?: "neon" | "pulse";
}) {
  const hover =
    accent === "pulse" ? "hover:border-pulse/40 hover:text-pulse" : "hover:border-neon/40 hover:text-neon";
  return (
    <Link
      href={href}
      className={`rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 transition-colors ${hover}`}
    >
      {children}
    </Link>
  );
}

export function ExecKpi({
  label,
  value,
  sub,
  tone = "text-slate-100",
  delay = 120,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: string;
  delay?: number;
}) {
  return (
    <div
      className="animate-panel-in rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="truncate font-mono text-[9px] text-slate-500">{sub}</p>
    </div>
  );
}

export function ExecCta({ role }: { role: string }) {
  return (
    <Link
      href="/my"
      className="block rounded-xl border border-pulse/30 bg-pulse/[0.06] p-8 text-center transition-colors hover:bg-pulse/[0.12]"
    >
      <p className="font-mono text-sm uppercase tracking-widest text-pulse">
        Describe your environment →
      </p>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-slate-400">
        Pick your vendors and sector in My Weather. The {role} view then quantifies your risk from
        the live threat picture — no log integration required.
      </p>
    </Link>
  );
}
