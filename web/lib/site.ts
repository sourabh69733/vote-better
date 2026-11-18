// The public address of the site. Set NEXT_PUBLIC_SITE_URL in production; without it, links in the
// sitemap and robots file point at the local server.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
