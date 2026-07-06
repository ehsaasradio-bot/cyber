import type { Metadata } from "next";
import CyberThreatIntel from "@/components/CyberThreatIntel";

export const metadata: Metadata = {
  title: "Cyber Threat Intel — CyberWeather",
  description:
    "Decisions, not data — the global threat picture turned into a short, ranked list of exactly what your team should do, personalized to your technology stack.",
};

export default function CyberThreatIntelPage() {
  return <CyberThreatIntel />;
}
