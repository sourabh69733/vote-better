import type { CandidacyRecord, PersonRecord, SourceRecord } from "@/lib/civic-records";
import type { WebPublication } from "@/lib/publication";

function displayName(name: string): string {
  return name.toLocaleLowerCase("en-IN").replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("en-IN"));
}

export function candidateProfilesFromPublication(
  publication: WebPublication,
  sources: readonly SourceRecord[],
  existingPersonIds: readonly string[],
): { people: PersonRecord[]; candidacies: CandidacyRecord[] } {
  const existing = new Set(existingPersonIds);
  const reviewedOn = publication.publishedAt?.slice(0, 10) ?? "";
  const people: PersonRecord[] = [];
  const candidacies: CandidacyRecord[] = [];

  for (const candidate of publication.dataset.candidacies) {
    if (existing.has(candidate.personId)) continue;
    const source = sources.find((item) => item.url === candidate.sourceUrl);
    if (!source || !candidate.resultDate || !reviewedOn) continue;
    people.push({ id: candidate.personId, name: displayName(candidate.name), reviewedOn });
    candidacies.push({
      id: `${candidate.personId}-jaipur-2024`,
      personId: candidate.personId,
      election: "Jaipur Lok Sabha, 2024",
      status: "not elected",
      resultDate: candidate.resultDate,
      votes: candidate.votes,
      sourceId: source.id,
      areaId: "jaipur-lok-sabha",
      party: candidate.party,
    });
  }

  return { people, candidacies };
}
