import type { ReactNode } from "react";

export default function GlassPanel({
  title,
  children,
  className = "",
  action,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={`flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_30px_-10px] shadow-cyan-500/20 backdrop-blur-xl ${className}`}
    >
      <header className="flex shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-4 py-3">
        <span className="size-1.5 rounded-full bg-neon animate-pulse-dot" />
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
          {title}
        </h2>
        {action && <div className="ml-auto">{action}</div>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}
