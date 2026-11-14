import { fetchText } from "./sansad-questions.js";

// Which Lok Sabha sessions have sat, from Digital Sansad's list of session dates, so scheduled runs pick
// up a new session on their own instead of a hand-kept list.

export const SESSION_DATES_URL = "https://sansad.in/api_ls/business/AllLoksabhaAndSessionDates";

export interface SessionWindow { session: number; firstDay: string; lastDay: string }

const iso = (day: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(day.trim());
  if (!match) throw new Error(`session date ${day} is not dd/mm/yyyy`);
  return `${match[3]}-${match[2]}-${match[1]}`;
};

// Each session lists one or more periods, such as "28/01/2026 to 02/04/2026".
export function parseSessionDates(body: string, loksabha = 18): SessionWindow[] {
  const houses = JSON.parse(body) as { loksabha: number; sessions: { sessionNo: number; sessionPeriod: string[] }[] }[];
  const house = houses.find((item) => item.loksabha === loksabha);
  if (!house) throw new Error(`no sessions listed for Lok Sabha ${loksabha}`);
  return house.sessions.map((item) => {
    const days = item.sessionPeriod.flatMap((period) => period.split(/\s+to\s+/).map(iso)).sort();
    if (!Number.isSafeInteger(item.sessionNo) || !days.length) throw new Error("invalid session entry");
    return { session: item.sessionNo, firstDay: days[0], lastDay: days.at(-1)! };
  }).sort((a, b) => a.session - b.session);
}

export interface SessionPlan {
  // Sessions that have begun, oldest first.
  held: number[];
  // Sessions whose records may still change: one sitting now, or one that ended within `settleDays`.
  refresh: number[];
}

export function planSessions(windows: readonly SessionWindow[], today: string, settleDays = 30): SessionPlan {
  const held = windows.filter((window) => window.firstDay <= today);
  const settled = new Date(`${today}T00:00:00Z`);
  settled.setUTCDate(settled.getUTCDate() - settleDays);
  const cutoff = settled.toISOString().slice(0, 10);
  return { held: held.map((window) => window.session), refresh: held.filter((window) => window.lastDay >= cutoff).map((window) => window.session) };
}

export async function loadSessionPlan(today = new Date().toISOString().slice(0, 10), request?: typeof fetch): Promise<SessionPlan> {
  const plan = planSessions(parseSessionDates(await fetchText(SESSION_DATES_URL, request)), today);
  if (!plan.held.length) throw new Error("Digital Sansad lists no session that has begun");
  return plan;
}

// The current members, as Digital Sansad lists them for questions; the all-member archives cover these.
export const ROSTER_URL = "https://sansad.in/api_ls/question/getMembers?lkNo=18";
export interface RosterMember { mpNo: number; mpName: string }

export async function loadRoster(request?: typeof fetch): Promise<RosterMember[]> {
  const rows = JSON.parse(await fetchText(ROSTER_URL, request)) as unknown;
  if (!Array.isArray(rows) || rows.length < 500 || rows.some((row) => !Number.isSafeInteger(row?.mpNo) || typeof row?.mpName !== "string")) {
    throw new Error("the Lok Sabha member list is incomplete or changed shape");
  }
  return rows.map((row) => ({ mpNo: row.mpNo, mpName: row.mpName }));
}
