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

interface OverridePoint {
  id: string;
  lat: number;
  lng: number;
  size: number;
  severity: string;
  type: string;
  source: string;
  title: string;
  label: string;
  occurredAt: string;
  country: string | null;
  city: string | null;
  ip: string | null;
  metadata: Record<string, unknown> | null;
}

export default function GlobePanel({
  window,
  view,
  overridePoints,
}: {
  window: "24h" | "7d";
  view: import("./ViewSelect").GlobeView;
  overridePoints?: OverridePoint[] | null;
}) {
  return <Globe window={window} view={view} overridePoints={overridePoints} />;
}
