import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The web app is its own project. Without this, Next.js picks the repo root when another lockfile exists there.
  turbopack: { root: import.meta.dirname },
  async redirects() {
    // The protest guide moved into the more detailed rights section.
    return [{ source: "/constitution/protest", destination: "/rights/protesting", permanent: true }];
  },
};

export default nextConfig;
