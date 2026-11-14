import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchText } from "./sansad-questions.js";

// Lok Sabha attendance for every sitting MP, one Digital Sansad record per member per session. Each record
// lists the session's sitting days by how the member marked the register. Digital Sansad reuse is still
// under review, so the saved records and the archive stay in ignored data/raw and are not published.

const raw = (...parts: string[]) => fileURLToPath(new URL(`../raw/sansad-attendance/${parts.join("/")}`, import.meta.url));
export const ATTENDANCE_ARCHIVE = raw("archive.json");
const MEMBERS = fileURLToPath(new URL("../raw/sansad-questions/ls18-s8/members.json", import.meta.url));

export const attendanceUrl = (session: number, memberId: number) =>
  `https://sansad.in/api_ls/member/getMemberAttendanceByMpsno?loksabha=18&session=${session}&mpsno=${memberId}`;

// The register's marks, as the member page's legend explains them.
const MARKS = {
  S: "signed", "S*": "signed", "S#": "signed", // in the register, by mobile, or both
  "NS@": "presentUnsigned", // present but forgot to sign
  NS: "notSigned",
  NR: "notRequired", // ministers, the Speaker and the Leader of the Opposition do not sign
} as const;

export interface SessionAttendance { signed: number; presentUnsigned: number; notSigned: number; notRequired: number; firstDay: string; lastDay: string }

// One member's record for one session, or null when it lists no days (not a member then).
export function parseAttendance(body: string): SessionAttendance | null {
  const rows = JSON.parse(body) as unknown;
  if (!Array.isArray(rows)) throw new Error("attendance record is not a list");
  const counts = { signed: 0, presentUnsigned: 0, notSigned: 0, notRequired: 0 };
  const days = new Set<string>();
  for (const row of rows as { attendanceType?: unknown; dates?: unknown }[]) {
    const mark = MARKS[row.attendanceType as keyof typeof MARKS];
    if (!mark || !Array.isArray(row.dates)) throw new Error(`unknown attendance mark ${String(row.attendanceType)}`);
    for (const date of row.dates) {
      const day = /^(\d{4}-\d{2}-\d{2}) 00:00:00$/.exec(String(date))?.[1];
      if (!day) throw new Error(`attendance date ${String(date)} is not a day`);
      if (days.has(day)) throw new Error(`${day} is marked twice`);
      days.add(day);
      counts[mark]++;
    }
  }
  if (!days.size) return null;
  const sorted = [...days].sort();
  return { ...counts, firstDay: sorted[0], lastDay: sorted.at(-1)! };
}

export interface AttendanceArchive {
  schemaVersion: 1;
  sourceLabel: "Digital Sansad";
  collectedAt: string;
  sessions: {
    session: number;
    // The sitting days most members' records list; records that list a different number are named.
    days: number; firstDay: string; lastDay: string;
    // Median share of required days signed, among members who had to sign every day.
    medianPercent: number | null;
    differentDays: number[];
    members: Record<string, SessionAttendance>;
  }[];
}

const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const total = (record: SessionAttendance) => record.signed + record.presentUnsigned + record.notSigned + record.notRequired;

export function buildAttendanceArchive(records: { session: number; memberId: number; record: SessionAttendance | null }[], collectedAt: string): AttendanceArchive {
  const bySession = new Map<number, Map<number, SessionAttendance>>();
  for (const { session, memberId, record } of records) {
    if (!bySession.has(session)) bySession.set(session, new Map());
    if (record) bySession.get(session)!.set(memberId, record);
  }
  const sessions = [...bySession].sort(([a], [b]) => a - b).flatMap(([session, members]) => {
    if (!members.size) return [];
    const counts = new Map<number, number>();
    for (const record of members.values()) counts.set(total(record), (counts.get(total(record)) ?? 0) + 1);
    const days = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
    const full = [...members.values()].filter((record) => total(record) === days && record.notRequired === 0);
    return [{
      session, days,
      firstDay: [...members.values()].map((record) => record.firstDay).sort()[0],
      lastDay: [...members.values()].map((record) => record.lastDay).sort().at(-1)!,
      medianPercent: median(full.map((record) => (record.signed / days) * 100)),
      differentDays: [...members].filter(([, record]) => total(record) !== days).map(([memberId]) => memberId).sort((a, b) => a - b),
      members: Object.fromEntries([...members].sort(([a], [b]) => a - b).map(([memberId, record]) => [String(memberId), record])),
    }];
  });
  return { schemaVersion: 1, sourceLabel: "Digital Sansad", collectedAt, sessions };
}

// Saves each record once; a saved record is not fetched again, so an interrupted run resumes. An empty
// record (a session not yet held, or not a member then) is never saved, so it is asked for again next run.
// `refresh` lists sessions to fetch again in full, for a session still sitting.
export async function collectAttendance(sessions: number[], memberIds: number[], options: { pauseMs?: number; request?: typeof fetch; log?: (line: string) => void; refresh?: number[]; directory?: string } = {}) {
  const directory = options.directory ?? raw();
  const pause = options.pauseMs ?? 700;
  const records: { session: number; memberId: number; record: SessionAttendance | null }[] = [];
  let latest = 0;
  for (const session of sessions) {
    await mkdir(path.join(directory, `ls18-s${session}`), { recursive: true });
    let fetched = 0;
    for (const memberId of memberIds) {
      const file = path.join(directory, `ls18-s${session}`, `${memberId}.json`);
      let body = options.refresh?.includes(session) ? null : await readFile(file, "utf8").catch(() => null);
      if (body === null) {
        body = await fetchText(attendanceUrl(session, memberId), options.request);
        fetched++;
        if (parseAttendance(body)) {
          await writeFile(`${file}.tmp`, body);
          await rename(`${file}.tmp`, file);
        }
        await new Promise((done) => setTimeout(done, pause));
      }
      const record = parseAttendance(body);
      if (record) latest = Math.max(latest, (await stat(file)).mtimeMs);
      records.push({ session, memberId, record });
    }
    const empty = records.filter((item) => item.session === session && !item.record).length;
    options.log?.(`session ${session}: ${fetched} fetched, ${memberIds.length - fetched} already saved, ${empty} with no days`);
  }
  if (!latest) throw new Error("no attendance records saved for these sessions");
  return { records, collectedAt: new Date(latest).toISOString() };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const sessions = (args.find((arg) => !arg.startsWith("--")) ?? "1,2,3,4,5,6,7,8").split(",").map(Number);
  const refresh = args.find((arg) => arg.startsWith("--refresh="))?.slice("--refresh=".length).split(",").map(Number) ?? [];
  const members = JSON.parse(await readFile(MEMBERS, "utf8")) as { mpNo: number }[];
  const { records, collectedAt } = await collectAttendance(sessions, members.map((member) => member.mpNo), { log: console.log, refresh });
  const archive = buildAttendanceArchive(records, collectedAt);
  await writeFile(`${ATTENDANCE_ARCHIVE}.tmp`, `${JSON.stringify(archive)}\n`);
  await rename(`${ATTENDANCE_ARCHIVE}.tmp`, ATTENDANCE_ARCHIVE);
  for (const item of archive.sessions) {
    console.log(`session ${item.session}: ${item.days} sitting days, ${Object.keys(item.members).length} members, median ${item.medianPercent?.toFixed(1) ?? "n/a"}%, ${item.differentDays.length} with a different day count`);
  }
}
