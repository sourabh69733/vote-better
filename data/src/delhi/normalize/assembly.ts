import type { ObservationDraft } from "../../store.js";
import { cellText, observation, sourceTableRows } from "./html-table.js";

export function normalizeAssembly(html: string, normalizedAt: string): ObservationDraft[] {
  const rows = sourceTableRows(html, ["NAME &amp; DESIGNATION", "RESIDENTIAL ADD"]);
  const result: ObservationDraft[] = [];
  for (const cells of rows) {
    if (cells.length !== 5 || !/^\d+\.?$/.test(cellText(cells[0]))) continue;
    const markedName = cells[1].match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i);
    const name = markedName ? cellText(markedName[1]) : cellText(cells[1]).split(" | ")[0];
    const role = cellText(markedName ? cells[1].replace(markedName[0], "") : cells[1].replace(name, ""))
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "").replace(/^\|\s*|\s*\|$/g, "").trim();
    if (!name || !role) continue;
    const officePhone = cellText(cells[2]);
    result.push(observation(`assembly-secretariat/row:${result.length + 1}`, name, {
      name, role, ...(officePhone ? { officePhone } : {}),
    }, normalizedAt, "delhi-assembly-directory-v1"));
  }
  if (!result.length) throw new Error("official directory layout has no valid officeholders");
  return result;
}
