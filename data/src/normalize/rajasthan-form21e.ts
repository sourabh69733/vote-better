import { assertSourceTime, isUtcInstant, type Snapshot, type SourceTime } from "../contracts.js";
import type { ObservationDraft } from "../store.js";

export const JAIPUR_FORM21E_NORMALIZER_VERSION = "rajasthan-form21e-manual-v1";

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value;
}

function count(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${label} must be a nonnegative integer`);
  return value as number;
}

export function normalizeJaipurForm21E(snapshot: Snapshot, input: unknown, normalizedAt: string): ObservationDraft[] {
  if (!isUtcInstant(normalizedAt)) throw new Error("normalizedAt must be a UTC instant");
  const source = record(input, "transcription");
  if (source.status !== "unreviewed-transcription" || source.method !== "manual-page-1") {
    throw new Error("unsupported transcription status or method");
  }
  if (`sha256:${source.snapshotSha256}` !== snapshot.contentHash) throw new Error("transcription hash does not match snapshot");
  if (source.sourceUrl !== snapshot.url) throw new Error("transcription URL does not match snapshot");

  const constituency = record(source.constituency, "constituency");
  const constituencyRaw = text(constituency.raw, "constituency raw text");
  if (constituency.number !== 7 || constituency.name !== "Jaipur") throw new Error("wrong constituency");
  const documentDate = record(source.documentDate, "documentDate");
  const originalDate = text(documentDate.raw, "documentDate raw text");
  const value = text(documentDate.value, "documentDate value");
  const day: SourceTime = { value, precision: "day", originalText: originalDate };
  assertSourceTime(day);
  const dateParts = /^([0-3]\d)\/([01]\d)\/(\d{4})$/.exec(originalDate);
  if (!dateParts || `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}` !== value) {
    throw new Error("document date transcription does not match its original text");
  }

  const candidates = source.candidates;
  if (!Array.isArray(candidates) || candidates.length !== 13) throw new Error("expected 13 candidate rows");
  const rows = candidates.map((candidate, index) => {
    const row = record(candidate, `candidate row ${index + 1}`);
    if (row.row !== index + 1) throw new Error("candidate rows must be consecutive and unique");
    return {
      row: index + 1,
      name: text(row.name, `candidate row ${index + 1} name`),
      party: text(row.party, `candidate row ${index + 1} party`),
      votes: count(row.votes, `candidate row ${index + 1} votes`),
    };
  });
  const totalsInput = record(source.totals, "totals");
  const totals = {
    electors: count(totalsInput.electors, "total electors"),
    validVotes: count(totalsInput.validVotes, "total valid votes"),
    notaVotes: count(totalsInput.notaVotes, "total NOTA votes"),
    rejectedVotes: count(totalsInput.rejectedVotes, "total rejected votes"),
    tenderedVotes: count(totalsInput.tenderedVotes, "total tendered votes"),
  };
  if (rows.reduce((sum, row) => sum + row.votes, 0) !== totals.validVotes) {
    throw new Error("candidate votes do not match valid vote total");
  }
  const winner = text(source.electedCandidateName, "elected candidate name");
  const winningRows = rows.filter((row) => row.name === winner);
  if (winningRows.length !== 1 || winningRows[0].votes !== Math.max(...rows.map((row) => row.votes))) {
    throw new Error("elected candidate does not match candidate rows");
  }

  const draft = (locator: string, predicate: string, rawValue: string, normalizedValue: ObservationDraft["normalizedValue"]): ObservationDraft => ({
    locator, predicate, rawValue, normalizedValue, validFrom: day,
    normalizedAt, normalizerVersion: JAIPUR_FORM21E_NORMALIZER_VERSION,
  });
  const facts: ObservationDraft[] = [
    draft("page 1, heading", "contest.constituency", constituencyRaw, { number: 7, name: "Jaipur" }),
    draft("page 1, date", "document.returnDate", originalDate, value),
  ];
  for (const row of rows) {
    const base = `page 1, candidate row ${row.row}`;
    facts.push(draft(`${base}, name`, "candidate.name", row.name, row.name));
    facts.push(draft(`${base}, party`, "candidate.party", row.party, row.party));
    facts.push(draft(`${base}, votes`, "candidate.votesPolled", String(row.votes), row.votes));
  }
  const totalFields: [keyof typeof totals, string, string][] = [
    ["electors", "total electors", "contest.totalElectors"],
    ["validVotes", "total valid votes", "contest.totalValidVotes"],
    ["notaVotes", "total NOTA votes", "contest.totalNotaVotes"],
    ["rejectedVotes", "total rejected votes", "contest.totalRejectedVotes"],
    ["tenderedVotes", "total tendered votes", "contest.totalTenderedVotes"],
  ];
  for (const [key, locator, predicate] of totalFields) {
    facts.push(draft(`page 1, ${locator}`, predicate, String(totals[key]), totals[key]));
  }
  facts.push(draft("page 1, declaration", "contest.electedCandidateName", winner, winner));
  return facts;
}
