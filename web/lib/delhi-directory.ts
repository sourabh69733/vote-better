import type { DelhiPublication } from "./delhi";

export interface DelhiSearchResult {
  institution: DelhiPublication["institutions"][number];
  office: DelhiPublication["offices"][number];
  holders: { person: DelhiPublication["people"][number]; status: DelhiPublication["appointments"][number]["status"] }[];
  trace: DelhiPublication["traces"][number];
  coverage: "partial" | "stale" | "missing" | "unknown";
}

export function searchDelhiRecords(publication: DelhiPublication, query: string, areaId?: string): DelhiSearchResult[] {
  const term = query.trim().toLocaleLowerCase("en-IN");
  if (/^\d{6}$/.test(term)) return []; // A PIN cannot prove an office boundary.
  if (areaId && !publication.jurisdictions.some((item) => item.areaId === areaId)) return [];
  const institutions = new Map(publication.institutions.map((item) => [item.id, item]));
  const people = new Map(publication.people.map((item) => [item.id, item]));
  const traces = new Map(publication.traces.map((item) => [item.id, item]));
  const results: { result: DelhiSearchResult; rank: number }[] = [];
  for (const office of publication.offices) {
    if (areaId && !publication.jurisdictions.some((item) => item.officeId === office.id && item.areaId === areaId)) continue;
    const institution = institutions.get(office.institutionId);
    const trace = traces.get(office.traceId);
    if (!institution || !trace) continue;
    const holders = publication.appointments.filter((item) => item.officeId === office.id).flatMap((item) => {
      const person = people.get(item.personId);
      return person ? [{ person, status: item.status }] : [];
    });
    const fields = [office.title, institution.name, ...holders.map((item) => item.person.name)].map((item) => item.toLocaleLowerCase("en-IN"));
    const rank = !term ? 0 : fields[0] === term ? 0 : fields[1] === term ? 1 : fields.some((item) => item === term) ? 2
      : fields[0].includes(term) ? 3 : fields[1].includes(term) ? 4 : fields.some((item) => item.includes(term)) ? 5 : Infinity;
    if (rank === Infinity) continue;
    const coverage = publication.coverage.find((item) => item.sourceId === trace.sourceId)?.state ?? "unknown";
    results.push({ result: { institution, office, holders, trace, coverage }, rank });
  }
  return results.sort((a, b) => a.rank - b.rank || a.result.office.title.localeCompare(b.result.office.title)).map((item) => item.result);
}
