import Link from "next/link";
import { slugify } from "@/lib/detail";

/* Server-safe building blocks shared by sector/group intel pages. */

export function IntelHeader({ chip }: { chip: string }) {
  return (
    <header className="flex animate-panel-in flex-wrap items-center gap-4 px-2 py-4">
      <Link
        href="/"
        className="font-mono text-lg font-semibold tracking-[0.35em] text-white transition-opacity hover:opacity-80"
      >
        CYBER<span className="text-neon">WEATHER</span>
      </Link>
      <span className="rounded-full border border-neon/30 bg-neon/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neon">
        {chip}
      </span>
      <Link
        href="/trends"
        className="ml-auto font-mono text-[11px] uppercase tracking-wider text-slate-400 transition-colors hover:text-neon"
      >
        Trends ↗
      </Link>
    </header>
  );
}

export function StatBlock({
  label,
  value,
  tone = "text-slate-100",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export function WeeklyBars({ weekly }: { weekly: { week: string; victims: number }[] }) {
  const max = Math.max(1, ...weekly.map((w) => w.victims));
  return (
    <div>
      <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">
        Weekly victims · 12 weeks
      </p>
      <div className="flex h-16 items-end gap-1">
        {weekly.map((w) => (
          <div
            key={w.week}
            title={`Week of ${w.week} · ${w.victims} victims`}
            className="flex-1 rounded-t-sm bg-sev-critical/70 transition-colors hover:bg-sev-critical"
            style={{ height: `${Math.max(w.victims > 0 ? 6 : 1, (w.victims / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-600">
        <span>{weekly[0]?.week}</span>
        <span>this week</span>
      </div>
    </div>
  );
}

export function ChipRow({
  label,
  items,
  hrefFor,
}: {
  label: string;
  items: { name: string; victims: number }[];
  hrefFor?: (name: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => {
          const inner = (
            <>
              {i.name} <span className="text-neon">{i.victims}</span>
            </>
          );
          const cls =
            "rounded border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-slate-300 transition-colors hover:border-neon/40 hover:text-slate-100";
          return hrefFor ? (
            <Link key={i.name} href={hrefFor(i.name)} className={cls}>
              {inner}
            </Link>
          ) : (
            <span key={i.name} className={cls}>
              {inner}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export interface VictimRow {
  id: number;
  title: string;
  occurredAt: Date;
  country: string | null;
  metadata: unknown;
}

export function VictimList({ victims, context }: { victims: VictimRow[]; context: "sector" | "group" }) {
  return (
    <ul className="divide-y divide-white/[0.04]">
      {victims.map((v) => {
        const meta = (v.metadata ?? {}) as Record<string, unknown>;
        const group = typeof meta.group === "string" ? meta.group : null;
        const sector = typeof meta.sector === "string" ? meta.sector : null;
        const secondary = context === "sector" ? group : sector;
        const secondaryHref =
          context === "sector" && group
            ? `/group/${slugify(group)}`
            : context === "group" && sector
              ? `/sector/${slugify(sector)}`
              : null;
        return (
          <li key={v.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-slate-200">{v.title}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                {v.occurredAt.toISOString().slice(0, 10)}
                {secondary && secondaryHref && (
                  <>
                    {" · "}
                    <Link href={secondaryHref} className="text-slate-400 hover:text-neon">
                      {secondary}
                    </Link>
                  </>
                )}
              </p>
            </div>
            {v.country && (
              <Link
                href={`/country/${v.country}`}
                className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-neon hover:underline"
              >
                {v.country}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
