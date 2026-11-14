import type { MetadataRoute } from "next";

import { RESULT_ELECTIONS, loadResults, seatHref } from "@/lib/results";
import { SITE_URL } from "@/lib/site";
import { listPersonSlugs } from "@/lib/verified-profile";
import { elections } from "@/records/elections";

// Every public page that holds a record: the main sections, each election, each seat result and each
// hand-checked profile. Pages that read local-only data (MPs, PIN search) are left out.
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, lastModified?: string, priority = 0.5): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`, ...(lastModified ? { lastModified: new Date(lastModified) } : {}), priority,
  });
  const seats = RESULT_ELECTIONS.flatMap((id) => {
    const results = loadResults(id);
    return results ? results.seats.map((seat) => page(seatHref(seat, id), results.publishedAt, id === "lok-sabha-2024" ? 0.6 : 0.4)) : [];
  });
  return [
    page("/", undefined, 1),
    ...["/elections", "/seats", "/constitution", "/rights", "/quests", "/about"].map((path) => page(path, undefined, 0.8)),
    ...elections.map((election) => page(`/elections/${election.id}`, undefined, election.countingOn ? 0.6 : 0.9)),
    ...seats,
    ...listPersonSlugs().map((slug) => page(`/people/${slug}`, undefined, 0.5)),
  ];
}
