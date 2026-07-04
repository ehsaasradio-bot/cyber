"use client";

import dynamic from "next/dynamic";

const Globe = dynamic(() => import("./Globe"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative size-40">
        <div className="absolute inset-0 animate-ping rounded-full border border-neon/20" />
        <div className="absolute inset-4 rounded-full border border-neon/30" />
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-widest text-neon/60">
          Acquiring
        </div>
      </div>
    </div>
  ),
});

export default function GlobePanel({ window }: { window: "24h" | "7d" }) {
  return <Globe window={window} />;
}
