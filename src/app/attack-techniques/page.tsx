import type { Metadata } from "next";
import AttackMatrix from "@/components/AttackMatrix";
import { IntelHeader } from "@/components/IntelBits";

export const metadata: Metadata = { title: "Attack Techniques — CyberWeather" };

export default function AttackTechniquesPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-16">
      <IntelHeader chip="Attack Techniques" />
      <p className="animate-panel-in px-2 text-[13px] leading-relaxed text-slate-400 [animation-delay:50ms]">
        A curated view of MITRE ATT&CK® tactics and techniques, weighted by how much of our last
        30 days of activity typically involves each one. These are type-level associations —
        "ransomware activity typically involves T1486" — not confirmed attribution for any single
        incident.
      </p>
      <div className="mt-4 animate-panel-in [animation-delay:100ms]">
        <AttackMatrix />
      </div>
    </main>
  );
}
