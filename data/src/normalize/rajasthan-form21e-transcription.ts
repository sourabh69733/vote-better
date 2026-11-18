import { isUtcInstant, type JsonValue } from "../contracts.js";
import type { ObservationDraft } from "../store.js";
import { slugify } from "./eci-ge2024-detailed-result.js";

// Returns of election (Form 21E) and result gazettes that CEO Rajasthan publishes as scanned images.
// Each is transcribed by hand into extractions/; this checks the transcription and turns it into
// candidate.result drafts in the same shape as ECI's assembly results. A person compares each
// transcription with its document before it is approved (review-batch.ts, transcription mode).

export const FORM21E_TRANSCRIPTION_VERSION = "rajasthan-form21e-transcription-v1";

export interface TranscribedReturn {
  electionId: string;
  sourceUrl: string;
  snapshotSha256: string;
  page: number;
  constituency: { number: number; name: string; raw: string };
  documentDate: { raw: string; value: string };
  candidates: { row: number; name: string; party: string; votes: number }[];
  totals: { electors: number; validVotes: number; notaVotes: number; rejectedVotes: number; tenderedVotes: number };
  elected: { row: number; raw: string };
}

export interface TranscribedDeclaration {
  electionId: string;
  sourceUrl: string;
  snapshotSha256: string;
  page: number;
  constituency: { number: number; name: string; raw: string };
  documentDate: { raw: string; value: string };
  elected: { name: string; raw: string; party: string; partyRaw: string };
  note?: string;
}

export interface Transcriptions { status: string; method: string; transcribedBy: string; transcribedOn: string; returns: TranscribedReturn[]; declarations: TranscribedDeclaration[] }

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SHA = /^[0-9a-f]{64}$/;
const plain = (value: string) => value.toLowerCase().replace(/^(shri|shrimati|smt\.?|dr\.?)\s+/i, "").replace(/[^a-z0-9]+/g, " ").trim();

function header(item: TranscribedReturn | TranscribedDeclaration, at: string) {
  if (!/^[a-z0-9-]+$/.test(item.electionId)) throw new Error(`${at}: election id`);
  if (!item.sourceUrl.startsWith("https://election.rajasthan.gov.in/")) throw new Error(`${at}: source must be on the CEO Rajasthan site`);
  if (!SHA.test(item.snapshotSha256)) throw new Error(`${at}: snapshotSha256 must be the PDF's SHA-256`);
  if (!Number.isInteger(item.page) || item.page < 1) throw new Error(`${at}: page`);
  if (!Number.isInteger(item.constituency.number) || item.constituency.number < 1 || !item.constituency.name.trim() || !item.constituency.raw.includes(String(item.constituency.number))) {
    throw new Error(`${at}: constituency number must appear in its raw text`);
  }
  if (!DAY.test(item.documentDate.value) || !item.documentDate.raw.trim()) throw new Error(`${at}: document date`);
}

// The checks a transcription must pass before anyone reviews it.
export function checkTranscriptions(input: Transcriptions): Transcriptions {
  if (input.status !== "unreviewed-transcription" || input.method !== "manual-from-page-image") throw new Error("unsupported transcription status or method");
  for (const item of input.returns) {
    const at = `${item.electionId} seat ${item.constituency.number}`;
    header(item, at);
    if (!item.candidates.length) throw new Error(`${at}: no candidates`);
    item.candidates.forEach((candidate, index) => {
      if (candidate.row !== index + 1) throw new Error(`${at}: candidate rows must be numbered 1 to ${item.candidates.length}`);
      if (!candidate.name.trim() || !candidate.party.trim() || !Number.isSafeInteger(candidate.votes) || candidate.votes < 0) throw new Error(`${at}: row ${candidate.row} is incomplete`);
    });
    for (const [key, value] of Object.entries(item.totals)) if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${at}: total ${key}`);
    const sum = item.candidates.reduce((total, candidate) => total + candidate.votes, 0);
    if (sum !== item.totals.validVotes) throw new Error(`${at}: candidate votes add up to ${sum}, the return says ${item.totals.validVotes}`);
    const elected = item.candidates[item.elected.row - 1];
    if (!elected || !plain(item.elected.raw).includes(plain(elected.name))) throw new Error(`${at}: the declared winner does not match row ${item.elected.row}`);
    const top = Math.max(...item.candidates.map((candidate) => candidate.votes));
    if (elected.votes !== top || item.candidates.filter((candidate) => candidate.votes === top).length !== 1) throw new Error(`${at}: the declared winner must have the most votes`);
  }
  for (const item of input.declarations) {
    const at = `${item.electionId} seat ${item.constituency.number}`;
    header(item, at);
    if (!item.elected.name.trim() || !item.elected.raw.trim() || !item.elected.party.trim()) throw new Error(`${at}: declared winner`);
  }
  return input;
}

const personKey = (electionId: string, seat: string, number: number, name: string, party: string, namesakes: number) =>
  `${electionId}/rajasthan/${number}-${slugify(seat)}/${slugify(name)}${namesakes > 1 ? `-${slugify(party)}` : ""}`;

export function normalizeReturn(item: TranscribedReturn, normalizedAt: string): ObservationDraft[] {
  if (!isUtcInstant(normalizedAt)) throw new Error("normalizedAt must be a UTC instant");
  const ranked = [...item.candidates].sort((a, b) => b.votes - a.votes);
  const contest = {
    electors: item.totals.electors, validVotes: item.totals.validVotes, notaVotes: item.totals.notaVotes,
    votesPolled: item.totals.validVotes + item.totals.notaVotes + item.totals.rejectedVotes, candidates: item.candidates.length,
  };
  const day = { value: item.documentDate.value, precision: "day" as const, originalText: item.documentDate.raw };
  return item.candidates.map((candidate) => {
    const namesakes = item.candidates.filter((other) => slugify(other.name) === slugify(candidate.name)).length;
    const value: Record<string, JsonValue> = {
      election: item.electionId, personKey: personKey(item.electionId, item.constituency.name, item.constituency.number, candidate.name, candidate.party, namesakes),
      state: "Rajasthan", constituency: item.constituency.name, seatNumber: item.constituency.number, name: candidate.name,
      gender: null, age: null, category: null, party: candidate.party, partySymbol: null,
      votes: { general: null, postal: null, total: candidate.votes },
      shareOfValidVotes: Math.round((candidate.votes / item.totals.validVotes) * 10000) / 100,
      rank: ranked.indexOf(candidate) + 1, contest,
      derived: ["shareOfValidVotes", "contest.votesPolled"],
    };
    return {
      locator: `page ${item.page}, candidate row ${candidate.row}`, predicate: "candidate.result", rawValue: JSON.stringify(candidate),
      normalizedValue: value, validFrom: day, normalizedAt, normalizerVersion: FORM21E_TRANSCRIPTION_VERSION,
    };
  });
}

// A gazette declaration names the winner only: one result with no vote counts.
export function normalizeDeclaration(item: TranscribedDeclaration, normalizedAt: string): ObservationDraft[] {
  if (!isUtcInstant(normalizedAt)) throw new Error("normalizedAt must be a UTC instant");
  return [{
    locator: `page ${item.page}, declaration`, predicate: "candidate.result", rawValue: `${item.elected.raw} (${item.elected.partyRaw})`,
    normalizedValue: {
      election: item.electionId, personKey: personKey(item.electionId, item.constituency.name, item.constituency.number, item.elected.name, item.elected.party, 1),
      state: "Rajasthan", constituency: item.constituency.name, seatNumber: item.constituency.number, name: item.elected.name,
      party: item.elected.party, rank: 1, declaredOnly: true, votes: null, contest: null,
    },
    validFrom: { value: item.documentDate.value, precision: "day", originalText: item.documentDate.raw },
    normalizedAt, normalizerVersion: FORM21E_TRANSCRIPTION_VERSION,
  }];
}
