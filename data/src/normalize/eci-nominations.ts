// Pages of ECI's candidate affidavit portal (affidavit.eci.gov.in): the seats in an election,
// and the nomination cards for one seat, ten to a page.

export type NominationStatus = "filed" | "accepted" | "rejected" | "withdrawn";

export interface NominationCard {
  name: string;
  party: string;
  status: NominationStatus;
  state: string;
  constituency: string;
  // On the contesting list, the candidate's number on the ballot.
  ballot: number | null;
}

// Counts from the boxes above the list. They count nomination papers, except contesting, which counts candidates.
export interface NominationCounts { all: number; accepted: number; rejected: number; withdrawn: number; contesting: number }

export interface NominationPage { counts: NominationCounts; cards: NominationCard[] }

const STATUS: Record<string, NominationStatus> = {
  applied: "filed", filed: "filed", pending: "filed",
  accepted: "accepted", rejected: "rejected", withdrawn: "withdrawn",
};

const COUNTS: Record<string, keyof NominationCounts> = {
  all: "all", accepted: "accepted", rejected: "rejected", withdrawn: "withdrawn", contesting: "contesting",
};

const decode = (value: string) => value
  .replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/\s+/g, " ").trim();

function field(card: string, label: string): string {
  const match = card.match(new RegExp(`<strong>${label} :</strong>\\s*(?:<strong><font[^>]*>)?([^<]*)`));
  const value = match ? decode(match[1]) : "";
  if (!value) throw new Error(`nomination card has no ${label.toLowerCase()}`);
  return value;
}

export function parseNominationPage(html: string): NominationPage {
  const counts: Partial<NominationCounts> = {};
  for (const [, value, label] of html.matchAll(/<p><span>(\d+)<\/span><\/p>\s*<h4>([^<]+)<\/h4>/g)) {
    const key = COUNTS[decode(label).toLowerCase()];
    if (key) counts[key] = Number(value);
  }
  const missing = Object.values(COUNTS).filter((key) => counts[key] === undefined);
  if (missing.length) throw new Error(`page has no ${missing.join(", ")} count; the portal layout may have changed`);

  const cards = [...html.matchAll(/<div class="details-name">([\s\S]*?)<!-- End of row Div -->/g)].map(([, card]): NominationCard => {
    const heading = card.match(/<h4 class="[^"]*">([^<]+)<\/h4>/);
    if (!heading) throw new Error("nomination card has no name");
    const numbered = decode(heading[1]).match(/^(?:(\d+)\.\s+)?(.+)$/)!;
    const statusText = field(card, "Status");
    const status = STATUS[statusText.toLowerCase()];
    if (!status) throw new Error(`unknown nomination status "${statusText}"`);
    return {
      name: numbered[2], party: field(card, "Party"), status,
      state: field(card, "State"), constituency: field(card, "Constituency"),
      ballot: numbered[1] ? Number(numbered[1]) : null,
    };
  });
  if (!cards.length && !/No Data/.test(html)) throw new Error("page has neither nomination cards nor a no-data notice");
  return { counts: counts as NominationCounts, cards };
}

// The seat picker's options: <option value="9">THATTANCHAVADY</option>.
export function parseSeatOptions(html: string): { number: number; name: string }[] {
  return [...html.matchAll(/<option value="(\d+)">([^<]+)<\/option>/g)].map(([, number, name]) => ({ number: Number(number), name: decode(name) }));
}

export type CandidateStatus = "contesting" | "accepted" | "filed" | "withdrawn" | "rejected";

export interface SeatCandidate {
  name: string;
  // The name as the portal writes it, in capitals.
  sourceName: string;
  party: string;
  status: CandidateStatus;
  ballot: number | null;
  // Nomination papers filed; a candidate may file up to four.
  nominations: number;
}

const ORDER: CandidateStatus[] = ["contesting", "accepted", "filed", "withdrawn", "rejected"];

// One row per candidate. Papers from the same name and party are one candidate. The contesting
// list is ECI's own final list and decides who is contesting and in what ballot order.
export function seatCandidates(all: readonly NominationCard[], contesting: readonly NominationCard[], readable: (name: string) => string = (name) => name): SeatCandidate[] {
  const key = (card: Pick<NominationCard, "name" | "party">) => `${card.name}\u0000${card.party}`;
  const candidates = new Map<string, SeatCandidate & { papers: NominationStatus[] }>();
  for (const card of all) {
    const known = candidates.get(key(card));
    if (known) { known.nominations++; known.papers.push(card.status); continue; }
    candidates.set(key(card), { name: readable(card.name), sourceName: card.name, party: card.party, status: "filed", ballot: null, nominations: 1, papers: [card.status] });
  }
  const ballots = new Set<number>();
  for (const card of contesting) {
    const candidate = candidates.get(key(card));
    if (!candidate) throw new Error(`${card.name} (${card.party}) is contesting but has no nomination on the full list`);
    if (card.ballot === null || ballots.has(card.ballot)) throw new Error(`${card.name} has no ballot number of its own`);
    ballots.add(card.ballot);
    candidate.status = "contesting";
    candidate.ballot = card.ballot;
  }
  for (const candidate of candidates.values()) {
    if (candidate.status === "contesting") continue;
    // Withdrawing ends a candidacy whatever happened to the other papers; one valid paper is enough to stand.
    const { papers } = candidate;
    candidate.status = papers.includes("withdrawn") ? "withdrawn" : papers.includes("accepted") ? "accepted" : papers.includes("filed") ? "filed" : "rejected";
  }
  return [...candidates.values()]
    .map(({ papers: _papers, ...candidate }) => candidate)
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || (a.ballot ?? 0) - (b.ballot ?? 0) || a.sourceName.localeCompare(b.sourceName));
}
