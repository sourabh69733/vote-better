import type { ObservationDraft } from "../../store.js";
import { cellText, observation, sourceTableRows } from "./html-table.js";

export function normalizeMps(html: string, normalizedAt: string): ObservationDraft[] {
  const rows = sourceTableRows(html, ["Constituency", "State", "Party Name"]);
  const result: ObservationDraft[] = [];
  for (const cells of rows) {
    if (cells.length !== 4) continue;
    const constituency = cellText(cells[0]);
    const state = cellText(cells[1]);
    const name = cellText(cells[2]);
    const party = cellText(cells[3]);
    const profilePath = cells[2].match(/href="(\/profile\/[a-z0-9-]+)"/i)?.[1];
    if (!state.includes("Delhi") || !name || !party || !profilePath) continue;
    const house = constituency ? "Lok Sabha" : "Rajya Sabha";
    const role = constituency ? `Lok Sabha MP, ${constituency}` : "Rajya Sabha MP, Delhi";
    result.push(observation(profilePath, name, { name, role, department: "Parliament of India", house,
      ...(constituency ? { constituency } : {}), party, profilePath }, normalizedAt, "delhi-gnctd-mps-v1"));
  }
  if (!result.length) throw new Error("official MP layout has no valid rows");
  return result;
}
