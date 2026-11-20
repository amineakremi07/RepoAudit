import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // shared-types is consumed as TypeScript source (no build step).
  transpilePackages: ["@repoaudit/shared-types"],
  poweredByHeader: false,
  // Sprint 4 TODO (Lead): strict CSP + security headers via `headers()`.
};

export default nextConfig;
