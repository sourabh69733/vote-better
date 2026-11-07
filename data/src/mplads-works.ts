import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

// MP Local Area Development Scheme works, from MoSPI's public eSAKSHI dashboard.
// The dashboard lists works recommended, sanctioned and completed, and payments, per MP.
// It covers works entered on eSAKSHI, which began on 1 April 2023.

const API = "https://mplads.mospi.gov.in/rest/PreLoginDashboardData";
export const DASHBOARD_URL = "https://mplads.mospi.gov.in/digigov/dashboard.html";
const LOK_SABHA = 2;
const TENURE_18 = 7;

export interface MpladsTarget {
  personId: string;
  officialName: string;
  stateId: number;
  constituencyId: number;
  constituency: string;
}

// Each tile on the dashboard opens a list. The list's last row is its total.
export const REPORTS = {
  allocated: { key: "Allocated Limit for Hon'ble MPs", list: "Allocated Limit", amount: "ALLOCATED_AMT" },
  recommended: { key: "Works Recommended", list: "Total Works Recommended", amount: "RECOMMENDED_AMOUNT" },
  sanctioned: { key: "Works Sanctioned", list: "Total Sanction Work", amount: "SANCTION_AMOUNT" },
  completed: { key: "Works Completed", list: "Total Works Completed", amount: "ACTUAL_AMOUNT" },
  payments: { key: "Expenditure on Completed and On-going Works as on Date", list: "Total Expenditure", amount: "FUND_DISBURSED_AMT" },
} as const;
type ReportName = keyof typeof REPORTS;

export interface MpladsResponses {
  member: string;
  tiles: string;
  reports: Record<ReportName, string>;
}

export interface MpladsWork {
  id: number;
  code: string | null;
  activity: string;
  // Hindi descriptions arrive as question marks: the feed is sent as Latin-1.
  description: string | null;
  category: string | null;
  districtAuthority: string;
  implementingAgency: string | null;
  stage: string | null;
  milestone: "recommended" | "sanctioned" | "completed";
  recommended: { on: string; amount: number } | null;
  sanctioned: { on: string; amount: number } | null;
  completed: { on: string; amount: number } | null;
  paid: number;
  paymentPending: number;
}

export interface MpladsMember {
  personId: string;
  officialName: string;
  constituency: string;
  tenure: string;
  tenureStart: string;
  allocated: number;
  totals: Record<Exclude<ReportName, "allocated">, { count: number; amount: number }>;
  sources: { report: string; sha256: string }[];
  works: MpladsWork[];
}

export interface MpladsPublication {
  schemaVersion: 1;
  collectedAt: string;
  source: { title: string; publisher: string; url: string };
  members: MpladsMember[];
}

type Row = Record<string, unknown>;

const sha256 = (body: string) => createHash("sha256").update(body).digest("hex");
// The feed writes "NA" or "N/A" for a value it does not have.
const text = (value: unknown) => {
  const clean = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return /^N\/?A$/i.test(clean) ? "" : clean;
};
const rupees = (value: number) => Math.round(value * 100) / 100;

function amount(row: Row, field: string): number {
  const value = row[field];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`Invalid ${field}: ${value}`);
  return value;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "28-Apr-2025" -> "2025-04-28"
export function feedDate(value: unknown): string {
  const match = text(value).match(/^(\d{2})-([A-Z][a-z]{2})-(\d{4})$/);
  const month = match ? MONTHS.indexOf(match[2]) + 1 : 0;
  if (!match || !month) throw new Error(`Invalid date: ${value}`);
  const iso = `${match[3]}-${String(month).padStart(2, "0")}-${match[1]}`;
  if (new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) !== iso) throw new Error(`Invalid date: ${value}`);
  return iso;
}

// "Jun 4, 2024 12:00:00 AM" -> "2024-06-04"
export function tenureDate(value: unknown): string {
  const match = text(value).match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}) /);
  if (!match) throw new Error(`Invalid tenure date: ${value}`);
  return feedDate(`${match[2].padStart(2, "0")}-${match[1]}-${match[3]}`);
}

// "WS/MP18165/2025-2026/195235-1.5 Construction of community centers" -> code and activity.
// Works not yet sanctioned have no code: "NA-1.5 Construction of community centers".
export function splitActivity(value: unknown): { code: string | null; activity: string } {
  const name = text(value);
  const match = name.match(/^(?:(WS\/MP\d+\/\d{4}-\d{4}\/\d+)|NA)-(?:\d+(?:\.\d+)*\s+)?(.+)$/);
  const activity = match ? match[2] : name.replace(/^\d+(?:\.\d+)*\s+/, "");
  if (!activity) throw new Error(`Work has no activity: ${value}`);
  return { code: match?.[1] ?? null, activity };
}

// Tile figures are Indian-grouped strings behind a garbled rupee sign: "�11,15,87,769.00".
function tileAmount(tile: unknown): number {
  if (!Array.isArray(tile)) throw new Error("Invalid tile");
  const figure = tile.map(text).find((part) => /^\D*[\d,]+\.\d{2}$/.test(part) && !/crore/i.test(part));
  if (!figure) throw new Error(`Tile has no amount: ${JSON.stringify(tile)}`);
  return Number(figure.replace(/[^\d.]/g, ""));
}

function tileCount(tile: unknown): number {
  const count = Array.isArray(tile) ? Number(text(tile[0])) : NaN;
  if (!Number.isSafeInteger(count) || count < 0) throw new Error(`Tile has no count: ${JSON.stringify(tile)}`);
  return count;
}

// Returns the list's rows and checks them against its closing total.
export function reportRows(body: string, name: ReportName): Row[] {
  const { list, amount: field } = REPORTS[name];
  const payload = JSON.parse(body) as Record<string, unknown>;
  if (typeof payload[list] !== "string") throw new Error(`Report ${name} has no ${list} list`);
  const rows = JSON.parse(payload[list] as string) as Row[];
  const total = rows.at(-1);
  if (!Array.isArray(rows) || !total || Object.keys(total).join() !== "Total_Amt") throw new Error(`Report ${name} has no total row`);
  const items = rows.slice(0, -1);
  const sum = items.reduce((running, row) => running + amount(row, field), 0);
  if (Math.abs(sum - amount(total, "Total_Amt")) > 1) throw new Error(`Report ${name} rows add to ${sum}, total says ${total.Total_Amt}`);
  return items;
}

function checkRow(row: Row, target: MpladsTarget, name: ReportName) {
  if (text(row.MP_NAME) !== target.officialName) throw new Error(`Report ${name} lists another MP: ${row.MP_NAME}`);
  if (text(row.CONSTITUENCY) !== target.constituency) throw new Error(`Report ${name} lists another seat: ${row.CONSTITUENCY}`);
  if (row.CONSTITUENCY_ID !== undefined && row.CONSTITUENCY_ID !== target.constituencyId) throw new Error(`Report ${name} lists seat ${row.CONSTITUENCY_ID}`);
}

function same<T>(label: string, id: number, first: T | null, second: T | null): T | null {
  if (first !== null && second !== null && JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error(`Work ${id} has two ${label}s: ${JSON.stringify(first)} and ${JSON.stringify(second)}`);
  }
  return first ?? second;
}

const dated = (row: Row | undefined, date: string, field: string) =>
  row && text(row[date]) ? { on: feedDate(row[date]), amount: amount(row, field) } : null;

export function buildMember(target: MpladsTarget, responses: MpladsResponses): MpladsMember {
  const members = JSON.parse(responses.member) as { ID: number; CAPTION: string }[];
  if (members.length !== 1 || members[0].CAPTION !== target.officialName) {
    throw new Error(`${target.constituency} has ${members.map((member) => member.CAPTION).join(", ") || "no MP"} on eSAKSHI, expected ${target.officialName}`);
  }
  const tiles = JSON.parse(responses.tiles) as Record<string, unknown>;
  const tenure = (tiles["Current Tenure"] as { CAPTION?: string }[] | undefined)?.[0]?.CAPTION;
  if (tenure !== "18th Lok Sabha") throw new Error(`Unexpected tenure: ${tenure}`);

  const rows = Object.fromEntries((Object.keys(REPORTS) as ReportName[]).map((name) => {
    const items = reportRows(responses.reports[name], name);
    for (const row of items) checkRow(row, target, name);
    return [name, items];
  })) as Record<ReportName, Row[]>;

  if (rows.allocated.length !== 1) throw new Error(`Expected one allocation, found ${rows.allocated.length}`);
  const allocation = rows.allocated[0];
  const allocated = amount(allocation, "ALLOCATED_AMT");
  if (Math.abs(allocated - tileAmount(tiles[REPORTS.allocated.key])) > 1) throw new Error("Allocation differs from its tile");

  const totals = {} as MpladsMember["totals"];
  for (const name of ["recommended", "sanctioned", "completed", "payments"] as const) {
    const { key, amount: field } = REPORTS[name];
    const count = rows[name].length;
    const sum = rupees(rows[name].reduce((running, row) => running + amount(row, field), 0));
    // The completed tile shows sanctioned cost; its list shows actual cost. Only its count is compared.
    if (name !== "payments" && tileCount(tiles[key]) !== count) throw new Error(`${key}: tile says ${tileCount(tiles[key])}, list has ${count}`);
    if (name !== "completed" && Math.abs(tileAmount(tiles[key]) - sum) > 1) throw new Error(`${key}: tile says ${tileAmount(tiles[key])}, list adds to ${sum}`);
    totals[name] = { count, amount: sum };
  }

  const byId = (list: Row[], name: string) => {
    const map = new Map<number, Row>();
    for (const row of list) {
      const id = row.WORK_RECOMMENDATION_DTL_ID;
      if (!Number.isSafeInteger(id)) throw new Error(`${name} row has no work ID`);
      if (map.has(id as number)) throw new Error(`${name} lists work ${id} twice`);
      map.set(id as number, row);
    }
    return map;
  };
  const recommended = byId(rows.recommended, "Recommended");
  const sanctioned = byId(rows.sanctioned, "Sanctioned");
  const completed = byId(rows.completed, "Completed");
  const payments = new Map<number, Row[]>();
  for (const row of rows.payments) {
    const id = row.WORK_RECOMMENDATION_DTL_ID as number;
    if (!Number.isSafeInteger(id)) throw new Error("Payment row has no work ID");
    payments.set(id, [...(payments.get(id) ?? []), row]);
  }

  const ids = [...new Set([...recommended.keys(), ...sanctioned.keys(), ...completed.keys(), ...payments.keys()])];
  const works = ids.map((id): MpladsWork => {
    const listed = [recommended.get(id), sanctioned.get(id), completed.get(id)].filter((row): row is Row => Boolean(row));
    const first = listed[0] ?? payments.get(id)![0];
    const { code, activity } = splitActivity(first.ACTIVITY_NAME);
    const description = text(first.WORK_DESCRIPTION);
    // The recommended list still says "Pending for Sanction" for sanctioned works, so the sanctioned list's stage wins.
    const stage = text(sanctioned.get(id)?.WORK_STAGE) || text(recommended.get(id)?.WORK_STAGE) || null;
    const sanction = same("sanction", id, dated(recommended.get(id), "SANCTION_DATE", "SANCTION_AMOUNT"), dated(sanctioned.get(id), "SANCTION_DATE", "SANCTION_AMOUNT"));
    const done = dated(completed.get(id), "ACTUAL_END_DATE", "ACTUAL_AMOUNT");
    const paidRows = payments.get(id) ?? [];
    const paidBy = (status: string) => rupees(paidRows.filter((row) => text(row.WORK_STATUS) === status).reduce((sum, row) => sum + amount(row, "FUND_DISBURSED_AMT"), 0));
    const unknown = paidRows.find((row) => !["Payment Success", "Payment In-Progress"].includes(text(row.WORK_STATUS)));
    if (unknown) throw new Error(`Work ${id} has payment status ${unknown.WORK_STATUS}`);
    const agencies = [...new Set(paidRows.map((row) => text(row.IA_NAME)).filter(Boolean))];
    return {
      id, code, activity,
      description: !description || /\?{3,}/.test(description) ? null : description,
      category: text(first.WORK_CATEGORY) || null,
      districtAuthority: text(first.IDA_NAME ?? paidRows[0]?.IDA_NAME),
      implementingAgency: agencies.length === 1 ? agencies[0] : null,
      stage,
      milestone: done ? "completed" : sanction ? "sanctioned" : "recommended",
      recommended: dated(recommended.get(id), "RECOMMENDATION_DATE", "RECOMMENDED_AMOUNT"),
      sanctioned: sanction,
      completed: done,
      paid: paidBy("Payment Success"),
      paymentPending: paidBy("Payment In-Progress"),
    };
  });
  const latest = (work: MpladsWork) => work.completed?.on ?? work.sanctioned?.on ?? work.recommended?.on ?? "";
  works.sort((a, b) => latest(b).localeCompare(latest(a)) || b.id - a.id);

  return {
    personId: target.personId,
    officialName: target.officialName,
    constituency: target.constituency,
    tenure,
    tenureStart: tenureDate(allocation.TENURE_START_DATE),
    allocated,
    totals,
    sources: [["member", responses.member], ["tiles", responses.tiles], ...Object.entries(responses.reports)]
      .map(([report, body]) => ({ report, sha256: sha256(body) })),
    works,
  };
}

export function buildPublication(targets: readonly MpladsTarget[], responses: readonly MpladsResponses[], collectedAt: string): MpladsPublication {
  if (!targets.length || targets.length !== responses.length) throw new Error("Each target needs its responses");
  if (new Set(targets.map((target) => target.personId)).size !== targets.length) throw new Error("Duplicate person ID");
  return {
    schemaVersion: 1,
    collectedAt,
    source: { title: "MPLADS eSAKSHI public dashboard", publisher: "Ministry of Statistics and Programme Implementation", url: DASHBOARD_URL },
    members: targets.map((target, index) => buildMember(target, responses[index])),
  };
}

async function post(endpoint: string, body: object, request: typeof fetch = fetch): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await request(`${API}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "VoteBetter/0.1 (public civic research)" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer()).toString("latin1");
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

export async function fetchResponses(target: MpladsTarget, request: typeof fetch = fetch): Promise<MpladsResponses> {
  const combo = `${target.stateId},${target.constituencyId},0,${LOK_SABHA},${TENURE_18}`;
  const member = await post("getMpAndConstCombo", { const_combo: `${target.constituencyId},${LOK_SABHA},${TENURE_18}` }, request);
  const tiles = await post("getTilesData", { uname: combo }, request);
  const reports = {} as Record<ReportName, string>;
  for (const [name, { key }] of Object.entries(REPORTS) as [ReportName, (typeof REPORTS)[ReportName]][]) {
    reports[name] = await post("getTilesReportData", { combo, key }, request);
  }
  return { member, tiles, reports };
}

// Fetches every target, keeps the raw bodies under ignored raw/mplads/, and replaces the output only when all of them check out.
export async function collectWorks(targets: readonly MpladsTarget[], output: string, rawRoot: string): Promise<MpladsPublication> {
  const collectedAt = new Date().toISOString();
  const responses: MpladsResponses[] = [];
  for (const target of targets) {
    const fetched = await fetchResponses(target);
    const rawDir = path.join(rawRoot, collectedAt.slice(0, 10), String(target.constituencyId));
    await mkdir(rawDir, { recursive: true });
    await writeFile(path.join(rawDir, "member.json"), fetched.member);
    await writeFile(path.join(rawDir, "tiles.json"), fetched.tiles);
    for (const [name, body] of Object.entries(fetched.reports)) await writeFile(path.join(rawDir, `${name}.json`), body);
    responses.push(fetched);
  }
  const publication = buildPublication(targets, responses, collectedAt);
  const temporary = `${output}.tmp`;
  await writeFile(temporary, `${JSON.stringify(publication, null, 2)}\n`);
  await rename(temporary, output);
  return publication;
}

async function main() {
  const targets = JSON.parse(await readFile(path.resolve("config", "mplads-targets.json"), "utf8")) as MpladsTarget[];
  const output = path.resolve("..", "web", "records", "imported", "mplads-works.json");
  const publication = await collectWorks(targets, output, path.resolve("raw", "mplads"));
  for (const member of publication.members) {
    const { recommended, sanctioned, completed } = member.totals;
    console.log(`${member.officialName}: ${recommended.count} recommended, ${sanctioned.count} sanctioned, ${completed.count} completed, ${member.works.length} works`);
  }
  console.log(`Saved ${output}`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
