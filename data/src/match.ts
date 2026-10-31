import type { EntityMatch, Observation } from "./contracts.js";

export interface KnownPerson {
  id: string;
  displayName: string;
  officialIds: readonly string[];
}

export function proposeMatches(observation: Observation, knownPeople: readonly KnownPerson[]): EntityMatch[] {
  const value = observation.normalizedValue;
  if (typeof value !== "string" || !value.trim()) return [];
  const byId = observation.predicate === "person.officialId";
  if (!byId && observation.predicate !== "candidate.name") return [];
  const candidates = knownPeople.filter((person) => byId
    ? person.officialIds.includes(value)
    : person.displayName.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase());
  const recordedAt = new Date().toISOString();
  return candidates.map((person) => ({
    id: "proposal", observationId: observation.id, entityId: person.id,
    status: byId && candidates.length === 1 ? "proposed" : "ambiguous",
    reason: byId && candidates.length === 1
      ? "Exact official identifier; reviewer confirmation required"
      : "Name alone does not establish identity",
    recordedAt,
  }));
}
