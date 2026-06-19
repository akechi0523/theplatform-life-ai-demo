import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep server-only packages (postgres, stripe) out of the client bundle.
  // In Next 15 this option lives at the top level (was experimental in 14).
  serverExternalPackages: ["postgres", "stripe"],
};

export default nextConfig;
