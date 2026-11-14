import assert from "node:assert/strict";
import test from "node:test";

import { getFactTrace, mergeJaipurCandidacies, validatePublication, type WebPublication } from "./publication";
import { jaipurCandidacies, jaipurSources } from "../records/jaipur";

function fact(id: string, predicate: string, value: string | number, sourceUrl: string): WebPublication["facts"][number] {
  return {
    id, subjectId: "manju-sharma", predicate, value,
    revisionId: "revision-1", publishedAt: "2026-10-06T10:00:00.000Z",
    reviewedAt: "2026-10-06T09:00:00.000Z",
    reviewMethod: "recorded-reviewer-decision",
    source: {
      url: sourceUrl, contentHash: `sha256:${"a".repeat(64)}`,
      capturedAt: "2026-10-06T08:00:00.000Z", locator: `page 1, candidate row 2, ${id.split("-")[0]}`,
      normalizerVersion: "test-v1", normalizedAt: "2026-10-06T08:10:00.000Z",
      recordedAt: "2026-10-06T08:11:00.000Z",
      validFrom: { value: "2024-06-04", precision: "day", originalText: "04/06/2024" },
    },
  };
}

const empty: WebPublication = {
  revisionId: null, previousRevisionId: null, publishedAt: null,
  facts: [], dataset: { candidacies: [] }, coverage: "not-assessed",
};

test("empty publication keeps the manually curated Jaipur record", () => {
  assert.deepEqual(validatePublication(empty), []);
  assert.deepEqual(mergeJaipurCandidacies(jaipurCandidacies, jaipurSources, empty), jaipurCandidacies);
});

test("a complete sourced candidate row can update the matching existing candidacy", () => {
  const sourceUrl = jaipurSources.find((source) => source.id === "jaipur-election-2024")!.url;
  const published: WebPublication = {
    revisionId: "revision-1", previousRevisionId: null, publishedAt: "2026-10-06T10:00:00.000Z",
    coverage: "not-assessed",
    facts: [
      fact("name-fact", "candidate.name", "MANJU SHARMA", sourceUrl),
      fact("party-fact", "candidate.party", "Bharatiya Janata Party", sourceUrl),
      fact("votes-fact", "candidate.votesPolled", 886850, sourceUrl),
    ],
    dataset: { candidacies: [{ personId: "manju-sharma", name: "MANJU SHARMA", party: "Bharatiya Janata Party",
      votes: 886850, resultDate: "2024-06-04", factIds: ["name-fact", "party-fact", "votes-fact"], sourceUrl }] },
  };
  assert.deepEqual(validatePublication(published), []);
  assert.equal(mergeJaipurCandidacies(jaipurCandidacies, jaipurSources, published)[0].votes, 886850);
  assert.equal(getFactTrace(published, "votes-fact")?.value, 886850);
});

test("a mismatched source cannot replace the curated candidacy", () => {
  const changed: WebPublication = {
    ...empty, revisionId: "revision-1", publishedAt: "2026-10-06T10:00:00.000Z",
    dataset: { candidacies: [{ personId: "manju-sharma", name: "MANJU SHARMA", party: "Bharatiya Janata Party",
      votes: 1, resultDate: "2024-06-04", factIds: ["n", "p", "v"], sourceUrl: "https://example.org/other.pdf" }] },
  };
  assert.ok(validatePublication(changed).length > 0);
  assert.deepEqual(mergeJaipurCandidacies(jaipurCandidacies, jaipurSources, changed), jaipurCandidacies);
});

test("a generated vote total must equal its cited fact", () => {
  const sourceUrl = jaipurSources.find((source) => source.id === "jaipur-election-2024")!.url;
  const publication: WebPublication = {
    revisionId: "revision-1", previousRevisionId: null, publishedAt: "2026-10-06T10:00:00.000Z",
    coverage: "not-assessed",
    facts: [
      fact("name-fact", "candidate.name", "MANJU SHARMA", sourceUrl),
      fact("party-fact", "candidate.party", "Bharatiya Janata Party", sourceUrl),
      fact("votes-fact", "candidate.votesPolled", 886850, sourceUrl),
    ],
    dataset: { candidacies: [{ personId: "manju-sharma", name: "MANJU SHARMA", party: "Bharatiya Janata Party",
      votes: 1, resultDate: "2024-06-04", factIds: ["name-fact", "party-fact", "votes-fact"], sourceUrl }] },
  };
  assert.ok(validatePublication(publication).some((error) => error.includes("value")));
  assert.deepEqual(mergeJaipurCandidacies(jaipurCandidacies, jaipurSources, publication), jaipurCandidacies);
});

test("coverage cannot claim more published rows than captured rows", () => {
  const publication: WebPublication = {
    ...empty,
    coverage: {
      areaId: "jaipur-lok-sabha", factType: "election-result-candidates",
      sourceUrl: "https://example.org/return.pdf", state: "covered", reason: "invalid",
      observedCandidateRows: 1, publishedCandidateRows: 2, computedAt: "2026-10-06T10:00:00.000Z",
    },
  };
  assert.ok(validatePublication(publication).some((error) => error.includes("Coverage")));
});
