import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// Share pages and their images are for posting, not search; research and mockup pages answer only in development.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/share/", "/research/", "/mockups/", "/my-area"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
