import type { Metadata } from "next";
import CeoDashboard from "@/components/CeoDashboard";

export const metadata: Metadata = {
  title: "Board View — CyberWeather",
  description:
    "Executive cyber risk in business terms: annualized loss exposure, compliance posture, and sector threat pressure for your organization.",
};

export default function CeoPage() {
  return <CeoDashboard />;
}
