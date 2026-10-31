import type { ObservationDraft } from "../../store.js";
import { cellText, observation, sourceTableRows } from "./html-table.js";

export function normalizeGnctd(html: string, normalizedAt: string): ObservationDraft[] {
  const rows = sourceTableRows(html, ["Designation", "Office No.", "Department"]);
  const result: ObservationDraft[] = [];
  for (const cells of rows) {
    if (cells.length !== 7) continue;
    const number = cellText(cells[0]);
    const name = cellText(cells[1]);
    const department = cellText(cells[2]);
    const role = cellText(cells[3]);
    if (!/^\d+$/.test(number) || !name || !department || !role) continue;
    const officeEmail = cellText(cells[4]).replace(/\[at\]/gi, "@").replace(/\[dot\]/gi, ".");
    const officePhone = cellText(cells[5]);
    result.push(observation(`table:who-is-who/row:${number}`, name, {
      name, department, role, ...(officeEmail ? { officeEmail } : {}), ...(officePhone ? { officePhone } : {}),
    }, normalizedAt, "delhi-gnctd-services-v1"));
  }
  if (!result.length) throw new Error("official directory layout has no valid officeholders");
  return result;
}
