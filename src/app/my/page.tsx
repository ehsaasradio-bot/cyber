import Link from "next/link";
import type { Metadata } from "next";
import MyWeather from "@/components/MyWeather";

export const metadata: Metadata = {
  title: "My Weather — CyberWeather",
};

export default function MyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16">
      <header className="flex animate-panel-in items-center gap-4 px-2 py-4">
        <Link
          href="/"
          className="font-mono text-lg font-semibold tracking-[0.35em] text-white transition-opacity hover:opacity-80"
        >
          CYBER<span className="text-neon">WEATHER</span>
        </Link>
        <span className="rounded-full border border-neon/30 bg-neon/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neon">
          My Weather
        </span>
        <Link
          href="/trends"
          className="ml-auto font-mono text-[11px] uppercase tracking-wider text-slate-400 transition-colors hover:text-neon"
        >
          Trends ↗
        </Link>
      </header>
      <div className="animate-panel-in [animation-delay:100ms]">
        <MyWeather />
      </div>
    </main>
  );
}
