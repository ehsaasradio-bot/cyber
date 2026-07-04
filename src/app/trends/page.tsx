import type { Metadata } from "next";
import TrendsDashboard from "@/components/TrendsDashboard";

export const metadata: Metadata = {
  title: "CyberWeather — Trend Analytics",
};

export default function TrendsPage() {
  return <TrendsDashboard />;
}
