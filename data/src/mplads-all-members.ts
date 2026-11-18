import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildMember, DASHBOARD_URL, fetchResponses, post, REPORTS, reportRows, type MpladsMember, type MpladsResponses, type MpladsTarget } from "./mplads-works.js";

// MPLADS works for every Lok Sabha seat, from eSAKSHI's own lists of states and constituencies, so no
// seat is matched by hand. Each seat's answers are saved for the day, so an interrupted run resumes.
// Whether MoSPI's data may be republished is still to be confirmed, and the archive is too large to ship,
// so it stays in ignored data/raw and is read only by a local build of the site.

const raw = (...parts: string[]) => fileURLToPath(new URL(`../raw/mplads/${parts.join("/")}`, import.meta.url));
export const ALL_MEMBERS_FUNDS = raw("archive-all-members.json");
const REPORT_FILES = ["member", "tiles", "allocated", "recommended", "sanctioned", "completed", "payments"] as const;

export interface Constituency { stateId: number; state: string; constituencyId: number; constituency: string }

const list = (body: string, label: string) => {
  const rows = JSON.parse(body) as unknown;
  if (!Array.isArray(rows) || !rows.length) throw new Error(`eSAKSHI returned no ${label}`);
  return rows as Record<string, unknown>[];
};

export async function loadConstituencies(request?: typeof fetch): Promise<Constituency[]> {
  const states = list(await post("getStateData", {}, request), "states");
  const seats: Constituency[] = [];
  for (const state of states) {
    if (!Number.isSafeInteger(state.STATE_ID) || typeof state.STATE_NAME !== "string") throw new Error("eSAKSHI state list changed shape");
    for (const row of list(await post("getConstituencyData", { id: state.STATE_ID }, request), `constituencies for ${state.STATE_NAME}`)) {
      if (!Number.isSafeInteger(row.ID) || typeof row.CAPTION !== "string") throw new Error(`eSAKSHI constituency list for ${state.STATE_NAME} changed shape`);
      seats.push({ stateId: state.STATE_ID as number, state: state.STATE_NAME, constituencyId: row.ID as number, constituency: row.CAPTION });
    }
  }
  // The dashboard lists Lok Sabha seats only; anything far from 543 means the lists changed.
  if (seats.length < 540 || seats.length > 546) throw new Error(`eSAKSHI lists ${seats.length} constituencies`);
  return seats;
}

export interface AllMembersMember extends MpladsMember { state: string; constituencyId: number }
export interface AllMembersFunds {
  schemaVersion: 1;
  collectedAt: string;
  source: { title: string; publisher: string; url: string };
  members: AllMembersMember[];
}

const spaced = (value: unknown) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

// The seat's MP as eSAKSHI names them. Some seats list one MP under two accounts ("NITYANAND RAI" and
// "Nityanand Rai"); the MP is then the one name every report row carries. A seat with no MP, or whose
// reports name two people (after a bye-election), is reported instead of guessed.
export function seatMember(seat: Constituency, responses: Pick<MpladsResponses, "member" | "reports">): MpladsTarget {
  const members = JSON.parse(responses.member) as { CAPTION?: unknown }[];
  if (!Array.isArray(members)) throw new Error("member list changed shape");
  const names = [...new Set(members.map((member) => spaced(member.CAPTION)).filter(Boolean))];
  const target = (officialName: string) => ({ personId: `esakshi-${seat.constituencyId}`, officialName, stateId: seat.stateId, constituencyId: seat.constituencyId, constituency: seat.constituency });
  if (names.length === 1) return target(names[0]);
  if (!names.length) throw new Error("no MP listed");
  const named = new Set((Object.keys(REPORTS) as (keyof typeof REPORTS)[]).flatMap((report) => reportRows(responses.reports[report], report).map((row) => spaced(row.MP_NAME))));
  const [only] = named;
  if (named.size === 1 && names.includes(only)) return target(only);
  throw new Error(`${names.length} MPs listed (${names.join(", ")}); reports name ${[...named].join(", ") || "no one"}`);
}

async function savedResponses(directory: string): Promise<MpladsResponses | null> {
  try {
    const [member, tiles, ...reports] = await Promise.all(REPORT_FILES.map((name) => readFile(path.join(directory, `${name}.json`), "latin1")));
    const [allocated, recommended, sanctioned, completed, payments] = reports;
    return { member, tiles, reports: { allocated, recommended, sanctioned, completed, payments } };
  } catch {
    return null;
  }
}

export async function updateAllMembersFunds(options: { day?: string; pauseMs?: number; log?: (line: string) => void } = {}) {
  const day = options.day ?? new Date().toISOString().slice(0, 10);
  const seats = await loadConstituencies();
  const members: AllMembersMember[] = [];
  const excluded: { constituencyId: number; constituency: string; state: string; reason: string }[] = [];
  let fetched = 0;
  for (const seat of seats) {
    const directory = raw(day, String(seat.constituencyId));
    try {
      let responses = await savedResponses(directory);
      if (!responses) {
        responses = await fetchResponses({ ...seat, personId: `esakshi-${seat.constituencyId}`, officialName: "" });
        await mkdir(directory, { recursive: true });
        const bodies = { member: responses.member, tiles: responses.tiles, ...responses.reports };
        // A seat is read back only when every file is there, so a half-saved seat is fetched again.
        for (const name of REPORT_FILES) await writeFile(path.join(directory, `${name}.json`), bodies[name], "latin1");
        fetched++;
        await new Promise((done) => setTimeout(done, options.pauseMs ?? 500));
        if (fetched % 50 === 0) options.log?.(`${fetched} seats fetched`);
      }
      const target = seatMember(seat, responses);
      members.push({ ...buildMember(target, responses), state: seat.state, constituencyId: seat.constituencyId });
    } catch (error) {
      excluded.push({ constituencyId: seat.constituencyId, constituency: seat.constituency, state: seat.state, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  const archive: AllMembersFunds = {
    schemaVersion: 1,
    collectedAt: `${day}T00:00:00.000Z`,
    source: { title: "MPLADS eSAKSHI public dashboard", publisher: "Ministry of Statistics and Programme Implementation", url: DASHBOARD_URL },
    members,
  };
  await mkdir(path.dirname(ALL_MEMBERS_FUNDS), { recursive: true });
  await writeFile(`${ALL_MEMBERS_FUNDS}.tmp`, `${JSON.stringify(archive)}\n`);
  await rename(`${ALL_MEMBERS_FUNDS}.tmp`, ALL_MEMBERS_FUNDS);
  return { archive, excluded, fetched, seats: seats.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { archive, excluded, fetched, seats } = await updateAllMembersFunds({ log: console.log });
  const works = archive.members.reduce((sum, member) => sum + member.works.length, 0);
  console.log(`${fetched} seats fetched; ${archive.members.length} of ${seats} seats, ${works} works written to ${ALL_MEMBERS_FUNDS}.`);
  for (const item of excluded) console.log(`  not included: ${item.state} / ${item.constituency} (${item.reason})`);
}
