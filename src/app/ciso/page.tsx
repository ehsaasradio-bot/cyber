import type { Metadata } from "next";
import CisoDashboard from "@/components/CisoDashboard";

export const metadata: Metadata = {
  title: "CISO View — CyberWeather",
  description:
    "Security posture for your stack: patch-now backlog, KEV and critical exposure, a ranked remediation queue, and your sector's threat landscape.",
};

export default function CisoPage() {
  return <CisoDashboard />;
}
