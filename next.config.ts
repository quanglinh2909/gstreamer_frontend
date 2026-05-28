import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Backend requests are proxied via the API route at
  // `src/pages/api/backend/[...path].ts`, which strips oversized headers
  // before forwarding. A plain rewrite cannot do that.
};

export default nextConfig;
