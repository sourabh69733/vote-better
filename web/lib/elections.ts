// Election calendar: what is being voted on, what is due, and what was counted recently.
// Records are curated from ECI press notes (see records/elections.ts). Nothing here is fetched live.

export type ElectionBody = "lok-sabha" | "assembly" | "bye-election";

export interface ElectionSource {
  title: string;
  publisher: string;
  url: string;
  // Date the record was checked against this source, YYYY-MM-DD.
  checkedOn: string;
}

export interface PollDay {
  // YYYY-MM-DD
  date: string;
  // What voted on this day when a poll has more than one day, e.g. "Phase 1, 121 seats".
  covers?: string;
}

export interface Election {
  id: string;
  body: ElectionBody;
  name: string;
  states: string[];
  seats?: number;
  // YYYY-MM-DD; absent until ECI announces the schedule.
  announcedOn?: string;
  polls: PollDay[];
  countingOn?: string;
  // When the current house's term ends: YYYY-MM-DD when the source states a day, YYYY-MM when it states only a month.
  termEndsOn?: string;
  resultsUrl?: string;
  // A page on this site that carries the results.
  siteHref?: string;
  note?: string;
  sources: ElectionSource[];
}

export type ElectionStatus = "due" | "announced" | "polling" | "counting" | "counted";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;

export const isDay = (value: string) => DAY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const isMonth = (value: string) => MONTH.test(value) && !Number.isNaN(Date.parse(`${value}-01T00:00:00Z`));

// Status on a given day (YYYY-MM-DD), from the schedule alone.
export function electionStatus(election: Pick<Election, "announcedOn" | "polls" | "countingOn">, today: string): ElectionStatus {
  const firstPoll = election.polls[0]?.date;
  if (!firstPoll || !election.announcedOn) return "due";
  if (election.countingOn && today > election.countingOn) return "counted";
  if (election.countingOn && today === election.countingOn) return "counting";
  if (today >= firstPoll) return "polling";
  if (today >= election.announcedOn) return "announced";
  return "due";
}

export const STATUS_LABEL: Record<ElectionStatus, string> = {
  due: "Due, schedule not announced",
  announced: "Announced",
  polling: "Polling",
  counting: "Counting today",
  counted: "Counted",
};

export const BODY_LABEL: Record<ElectionBody, string> = {
  "lok-sabha": "Lok Sabha",
  assembly: "State assembly",
  "bye-election": "Bye-election",
};

export function formatDay(value: string): string {
  if (isMonth(value)) {
    return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T00:00:00Z`));
  }
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export interface ElectionGroups {
  now: Election[];
  upcoming: Election[];
  recent: Election[];
}

// Live first; upcoming by term end; recent by counting day, latest first.
export function groupElections(elections: readonly Election[], today: string): ElectionGroups {
  const now: Election[] = [];
  const upcoming: Election[] = [];
  const recent: Election[] = [];
  for (const election of elections) {
    const status = electionStatus(election, today);
    if (status === "counted") recent.push(election);
    else if (status === "due") upcoming.push(election);
    else now.push(election);
  }
  now.sort((a, b) => a.polls[0].date.localeCompare(b.polls[0].date));
  upcoming.sort((a, b) => (a.termEndsOn ?? "9999").localeCompare(b.termEndsOn ?? "9999") || a.name.localeCompare(b.name));
  recent.sort((a, b) => (b.countingOn ?? "").localeCompare(a.countingOn ?? ""));
  return { now, upcoming, recent };
}

export function validateElections(elections: readonly Election[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const election of elections) {
    const at = `election ${election.id}`;
    if (!/^[a-z0-9-]+$/.test(election.id)) errors.push(`${at}: id must be lowercase letters, digits and hyphens`);
    if (ids.has(election.id)) errors.push(`${at}: duplicate id`);
    ids.add(election.id);
    if (!election.name.trim()) errors.push(`${at}: needs a name`);
    if (!election.states.length) errors.push(`${at}: needs at least one state or union territory`);
    if (election.seats !== undefined && !(Number.isInteger(election.seats) && election.seats > 0)) errors.push(`${at}: seats must be a positive integer`);
    for (const [field, value] of [["announcedOn", election.announcedOn], ["countingOn", election.countingOn]] as const) {
      if (value !== undefined && !isDay(value)) errors.push(`${at}: ${field} must be YYYY-MM-DD`);
    }
    if (election.termEndsOn !== undefined && !isDay(election.termEndsOn) && !isMonth(election.termEndsOn)) errors.push(`${at}: termEndsOn must be YYYY-MM-DD or YYYY-MM`);
    election.polls.forEach((poll, index) => {
      if (!isDay(poll.date)) errors.push(`${at}: poll ${index + 1} date must be YYYY-MM-DD`);
      if (index && poll.date <= election.polls[index - 1].date) errors.push(`${at}: poll days must be in ascending order`);
    });
    if (election.polls.length && !election.announcedOn) errors.push(`${at}: a scheduled poll needs its announcement date`);
    if (election.announcedOn && election.polls.length && election.polls[0].date <= election.announcedOn) errors.push(`${at}: polling must follow the announcement`);
    if (election.countingOn && election.polls.length && election.countingOn < election.polls.at(-1)!.date) errors.push(`${at}: counting cannot precede the last poll day`);
    if (election.countingOn && !election.polls.length) errors.push(`${at}: a counting day needs poll days`);
    if (!election.sources.length) errors.push(`${at}: needs at least one source`);
    for (const source of election.sources) {
      if (!source.url.startsWith("https://")) errors.push(`${at}: source "${source.title}" needs an HTTPS URL`);
      if (!isDay(source.checkedOn)) errors.push(`${at}: source "${source.title}" needs a checkedOn day`);
      if (!source.title.trim() || !source.publisher.trim()) errors.push(`${at}: source needs a title and publisher`);
    }
    for (const url of [election.resultsUrl]) if (url !== undefined && !url.startsWith("https://")) errors.push(`${at}: resultsUrl needs an HTTPS URL`);
    if (election.siteHref !== undefined && !election.siteHref.startsWith("/")) errors.push(`${at}: siteHref must be a path on this site`);
  }
  return errors;
}

// The latest day any record was checked, shown on the page as "checked on".
export function lastCheckedOn(elections: readonly Election[]): string | undefined {
  return elections.flatMap((election) => election.sources.map((source) => source.checkedOn)).sort().at(-1);
}

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
