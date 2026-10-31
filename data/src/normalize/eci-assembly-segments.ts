import * as XLSX from "xlsx";

// ECI GE 2024 statistical report 15, "Assembly Segment Wise Information of Electors": the Lok Sabha seat
// each assembly seat belongs to. The report has no assembly seat numbers and is ordered by Lok Sabha seat,
// so rows are matched to numbered assembly seats by name.

export const ECI_GE2024_SEGMENTS_URL = "https://www.eci.gov.in/eci-backend/public/all_files/GE-2024-statistical-report/15-Assembly-SegmentWise-Information-Electors.xls";

type Cell = string | number | null;

export interface SegmentRow { excelRow: number; state: string; assembly: string; parliament: string; electors: number }

export function parseAssemblySegments(bytes: Buffer): SegmentRow[] {
  const book = XLSX.read(bytes, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json<Cell[]>(book.Sheets[book.SheetNames[0]], { header: 1, defval: null, raw: true });
  if (!/^15\. assembly segmentwise information electors$/i.test(String(rows[0]?.[0] ?? "").trim())) throw new Error("not ECI report 15");
  const header = rows.findIndex((row) => String(row[1] ?? "").trim() === "AC NAME" && String(row[2] ?? "").trim() === "PC NAME");
  if (header < 0 || String(rows[header][14] ?? "").trim() !== "TOTAL ELECTORS") throw new Error("report 15 header changed");
  const out = rows.flatMap((row, index) => {
    if (index <= header || typeof row[0] !== "string" || typeof row[1] !== "string" || typeof row[2] !== "string" || typeof row[14] !== "number") return [];
    return [{ excelRow: index + 1, state: row[0].trim(), assembly: row[1].trim(), parliament: row[2].trim(), electors: row[14] }];
  });
  if (out.length < 4000) throw new Error(`report 15 has only ${out.length} assembly segments`);
  return out;
}

// Spellings in report 15 that differ from the assembly results, checked by hand against the seat lists
// and the Lok Sabha seat each belongs to. Keys are report 15's spelling; values are assembly seat numbers.
export const SEGMENT_ALIASES: Record<string, Record<string, number>> = {
  Rajasthan: { LACHMANGARH: 33, KHINVSAR: 110, "MARWAR JUNCITON": 119, GUDAMALANI: 139, VALLABNAGAR: 155 },
};

export interface AssemblySeatRef { number: number; sourceName: string; electors: number | null }
export interface ParliamentSeatRef { sourceName: string; slug: string; name: string }
export interface SegmentLink { assemblyNumber: number; parliament: ParliamentSeatRef; rule: "name" | "alias" | "electors"; excelRow: number }

const key = (value: string) => value.toLowerCase().replace(/\((sc|st)\)/g, "").replace(/[^a-z0-9]/g, "");

// Every assembly seat must get exactly one Lok Sabha seat. A name used by two assembly seats (Rajasthan has
// two Shahpuras) is settled by electors: each report 15 row goes to the seat whose 2023 electors are closest,
// within 5 percent, and the pairing must be one to one.
export function linkSegments(state: string, rows: SegmentRow[], assembly: AssemblySeatRef[], parliament: ParliamentSeatRef[]): SegmentLink[] {
  const stateRows = rows.filter((row) => row.state === state);
  if (stateRows.length !== assembly.length) throw new Error(`${state}: report 15 has ${stateRows.length} segments, the assembly results ${assembly.length}`);
  const byName = new Map<string, AssemblySeatRef[]>();
  for (const seat of assembly) byName.set(key(seat.sourceName), [...(byName.get(key(seat.sourceName)) ?? []), seat]);
  const pcOf = new Map(parliament.map((seat) => [key(seat.sourceName), seat]));
  const aliases = SEGMENT_ALIASES[state] ?? {};
  const links = new Map<number, SegmentLink>();
  const ambiguous: SegmentRow[] = [];
  for (const row of stateRows) {
    const pc = pcOf.get(key(row.parliament));
    if (!pc) throw new Error(`${state}: no Lok Sabha seat named ${row.parliament}`);
    const alias = aliases[row.assembly];
    const candidates = alias ? assembly.filter((seat) => seat.number === alias) : byName.get(key(row.assembly)) ?? [];
    if (!candidates.length) throw new Error(`${state}: report 15 row ${row.excelRow} "${row.assembly}" matches no assembly seat; add a reviewed alias`);
    if (candidates.length > 1) { ambiguous.push(row); continue; }
    const number = candidates[0].number;
    if (links.has(number)) throw new Error(`${state}: assembly seat ${number} matched twice`);
    links.set(number, { assemblyNumber: number, parliament: pc, rule: alias ? "alias" : "name", excelRow: row.excelRow });
  }
  for (const row of ambiguous) {
    const options = (byName.get(key(row.assembly)) ?? []).filter((seat) => !links.has(seat.number) && seat.electors);
    const best = options.sort((a, b) => Math.abs(a.electors! - row.electors) - Math.abs(b.electors! - row.electors))[0];
    if (!best || Math.abs(best.electors! - row.electors) / row.electors > 0.05) throw new Error(`${state}: cannot settle "${row.assembly}" in ${row.parliament} by electors`);
    links.set(best.number, { assemblyNumber: best.number, parliament: pcOf.get(key(row.parliament))!, rule: "electors", excelRow: row.excelRow });
  }
  const missing = assembly.filter((seat) => !links.has(seat.number));
  if (missing.length) throw new Error(`${state}: no Lok Sabha seat for ${missing.map((seat) => seat.sourceName).join(", ")}`);
  return [...links.values()].sort((a, b) => a.assemblyNumber - b.assemblyNumber);
}
