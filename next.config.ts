import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // geoip-lite loads its binary .dat files relative to __dirname — must stay unbundled
  serverExternalPackages: ["geoip-lite"],
};

export default nextConfig;
