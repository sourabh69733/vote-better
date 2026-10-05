import type { CandidacyRecord, SourceRecord } from "./civic-records";
import generatedJaipur from "../records/generated/jaipur.json";

interface SourceTime {
  value: string;
  precision: "instant" | "day" | "month" | "year";
  originalText: string;
  sourceTimezone?: string;
}

export interface WebFact {
  id: string;
  subjectId: string;
  predicate: string;
  value: string | number | boolean | null | object;
  revisionId: string;
  publishedAt: string;
  reviewedAt: string;
  reviewMethod: "agent-visual-check" | "recorded-reviewer-decision";
  priorFactId?: string;
  source: {
    url: string;
    contentHash: string;
    capturedAt: string;
    locator: string;
    normalizerVersion: string;
    normalizedAt: string;
    recordedAt: string;
    validFrom?: SourceTime;
    sourcePublishedAt?: SourceTime;
  };
}

export interface WebPublication {
  revisionId: string | null;
  previousRevisionId: string | null;
  publishedAt: string | null;
  facts: WebFact[];
  dataset: { candidacies: {
    personId: string;
    name: string;
    party: string;
    votes: number;
    resultDate?: string;
    sourceUrl: string;
    factIds: string[];
  }[] };
  coverage: "not-assessed";
}

export const jaipurPublication = generatedJaipur as WebPublication;

export function getFactTrace(publication: WebPublication, factId: string): WebFact | undefined {
  return publication.facts.find((fact) => fact.id === factId);
}

export function validatePublication(publication: WebPublication): string[] {
  const errors: string[] = [];
  if (publication.facts.length && (!publication.revisionId || !publication.publishedAt)) {
    errors.push("Published facts need a revision and publication time");
  }
  const facts = new Map<string, WebFact>();
  for (const fact of publication.facts) {
    if (facts.has(fact.id)) errors.push(`Duplicate fact ${fact.id}`);
    facts.set(fact.id, fact);
    if (!fact.source.url.startsWith("https://") || !fact.source.locator || !fact.source.contentHash.startsWith("sha256:")) {
      errors.push(`Fact ${fact.id} needs source evidence`);
    }
    if (!fact.reviewedAt || !fact.publishedAt || !fact.source.capturedAt || !fact.source.recordedAt) {
      errors.push(`Fact ${fact.id} needs review and source timestamps`);
    }
  }
  for (const candidate of publication.dataset.candidacies) {
    const expected = ["candidate.name", "candidate.party", "candidate.votesPolled"];
    if (candidate.factIds.length !== expected.length || candidate.factIds.some((id, i) => {
      const fact = facts.get(id);
      return !fact || fact.predicate !== expected[i] || fact.subjectId !== candidate.personId ||
        fact.source.url !== candidate.sourceUrl;
    })) errors.push(`Candidacy ${candidate.personId} lacks matching fact traces`);
    const [name, party, votes] = candidate.factIds.map((id) => facts.get(id));
    if (name && party && votes && (name.value !== candidate.name || party.value !== candidate.party ||
      votes.value !== candidate.votes || (candidate.resultDate &&
      (votes.source.validFrom?.precision !== "day" || votes.source.validFrom.value !== candidate.resultDate)))) {
      errors.push(`Candidacy ${candidate.personId} value differs from cited facts`);
    }
  }
  return errors;
}

export function mergeJaipurCandidacies(
  manual: readonly CandidacyRecord[], sources: readonly SourceRecord[], publication: WebPublication,
): CandidacyRecord[] {
  if (validatePublication(publication).length) return [...manual];
  return manual.map((record) => {
    const sourceUrl = sources.find((source) => source.id === record.sourceId)?.url;
    const candidate = publication.dataset.candidacies.find((item) => item.personId === record.personId &&
      item.sourceUrl === sourceUrl && item.resultDate === record.resultDate);
    return candidate ? { ...record, votes: candidate.votes } : record;
  });
}

export function getJaipurVoteTraceId(personId: string): string | undefined {
  const candidate = jaipurPublication.dataset.candidacies.find((item) => item.personId === personId);
  if (!candidate || validatePublication(jaipurPublication).length) return undefined;
  return candidate.factIds[2];
}
