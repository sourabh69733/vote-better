import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Lok Sabha attendance for every sitting MP, built by data/src/sansad-attendance.ts from Digital Sansad.
// Digital Sansad reuse is still under review, so the archive is local only and is never deployed.

interface SessionRecord { signed: number; presentUnsigned: number; notSigned: number; notRequired: number; firstDay: string; lastDay: string }
export interface AttendanceArchive {
  collectedAt: string;
  sessions: { session: number; days: number; firstDay: string; lastDay: string; medianPercent: number | null; members: Record<string, SessionRecord> }[];
}

export interface MemberAttendance {
  sessions: { session: number; firstDay: string; lastDay: string; days: number; required: number; signed: number; presentUnsigned: number; percent: number | null; medianPercent: number | null }[];
  signed: number;
  required: number;
  percent: number | null;
  // Sessions in which the member did not have to sign on some or all days (as a minister, Speaker or Leader of the Opposition).
  exemptSessions: number;
  collectedAt: string;
  sourceUrl: string;
}

// Required days are the days in the member's record less the days they did not have to sign.
export function summarizeAttendance(archive: AttendanceArchive, memberId: number): MemberAttendance | null {
  const sessions = archive.sessions.flatMap((session) => {
    const record = session.members[String(memberId)];
    if (!record) return [];
    const days = record.signed + record.presentUnsigned + record.notSigned + record.notRequired;
    const required = days - record.notRequired;
    return [{
      session: session.session, firstDay: record.firstDay, lastDay: record.lastDay, days, required, signed: record.signed, presentUnsigned: record.presentUnsigned,
      percent: required ? (record.signed / required) * 100 : null, medianPercent: session.medianPercent,
    }];
  });
  if (!sessions.length) return null;
  const signed = sessions.reduce((sum, session) => sum + session.signed, 0);
  const required = sessions.reduce((sum, session) => sum + session.required, 0);
  return {
    sessions, signed, required, percent: required ? (signed / required) * 100 : null,
    exemptSessions: sessions.filter((session) => session.required < session.days).length,
    collectedAt: archive.collectedAt, sourceUrl: `https://sansad.in/ls/members/biography/${memberId}?from=members`,
  };
}

// Kept once read; a missing file is looked for again, so a local archive added later is picked up.
let archive: AttendanceArchive | undefined;

export function getMemberAttendance(memberId: number, path = process.env.VOTE_BETTER_ATTENDANCE_FILE ?? resolve(process.cwd(), "../data/raw/sansad-attendance/archive.json")) {
  if (!archive) {
    try {
      archive = JSON.parse(readFileSync(path, "utf8")) as AttendanceArchive;
    } catch {
      return null;
    }
  }
  return summarizeAttendance(archive, memberId);
}
