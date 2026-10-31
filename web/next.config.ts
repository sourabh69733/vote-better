import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The protest guide moved into the more detailed rights section.
    return [{ source: "/constitution/protest", destination: "/rights/protesting", permanent: true }];
  },
};

export default nextConfig;
