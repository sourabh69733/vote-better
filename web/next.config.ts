import type { NextConfig } from "next";

// Headers for every page. The content policy only limits framing, plugins, base URLs and form targets,
// so it never blocks the site's own scripts and styles.
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      // The protest guide moved into the more detailed rights section.
      { source: "/constitution/protest", destination: "/rights/protesting", permanent: true },
      // The Delhi directory was removed on 2026-11-12.
      { source: "/delhi/:path*", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
