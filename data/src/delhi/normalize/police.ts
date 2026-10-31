import type { ObservationDraft } from "../../store.js";
import { cellText, sourceTableRows } from "./html-table.js";

export function normalizePolice(html: string, normalizedAt: string): ObservationDraft[] {
  const rows = sourceTableRows(html, ["Office/Police Station", "District/Unit", "Telephone No."]);
  const result: ObservationDraft[] = [];
  for (const cells of rows) {
    if (cells.length !== 7) continue;
    const number = cellText(cells[0]);
    const office = cellText(cells[1]);
    const officePhone = cellText(cells[2]);
    const unit = cellText(cells[5]);
    if (!/^\d+$/.test(number) || !office || !officePhone || !unit) continue;
    result.push({ locator: `police-directory/row:${number}`, predicate: "contact.official", rawValue: officePhone,
      normalizedValue: { office, officePhone, unit }, normalizedAt, normalizerVersion: "delhi-police-directory-v1" });
  }
  if (!result.length) throw new Error("official directory layout has no valid office contacts");
  return result;
}
