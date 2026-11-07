import type { ObservationDraft } from "../../store.js";
import { cellText, observation } from "./html-table.js";

function field(card: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = card.match(new RegExp(`<strong>\\s*${escaped}\\s*<\\/strong>\\s*(?:<p[^>]*>|<span[^>]*>)([\\s\\S]*?)(?:<\\/p>|<\\/span>)`, "i"));
  return match ? cellText(match[1]) : "";
}

export function normalizeMinisters(html: string, normalizedAt: string): ObservationDraft[] {
  const parts = html.split(/<div\s+class="profile-bio">/i).slice(1);
  const result: ObservationDraft[] = [];
  for (const part of parts) {
    const profilePath = part.match(/<a[^>]+href="(\/profile\/[a-z0-9-]+)"[^>]*>\s*View Profile\s*<\/a>/i)?.[1];
    const heading = part.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1];
    const name = heading ? cellText(heading).replace(/\s*\(\s*Minister\s*\)\s*$/i, "").trim() : "";
    const portfolio = field(part, "Minister for");
    if (!profilePath || !name || !portfolio || !/\(\s*Minister\s*\)/i.test(heading ?? "")) continue;
    const officeEmail = field(part, "Email");
    const officePhone = field(part, "Office Phone");
    result.push(observation(profilePath, name, { name, role: "Minister", department: "Government of NCT of Delhi", portfolio, profilePath,
      ...(officeEmail ? { officeEmail } : {}), ...(officePhone ? { officePhone } : {}) }, normalizedAt, "delhi-gnctd-ministers-v1"));
  }
  if (!result.length) throw new Error("official minister layout has no valid rows");
  return result;
}
