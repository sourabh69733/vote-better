import importedDebates from "@/records/imported/lok-sabha-18-debates.json";

export interface ParliamentaryDebate {
  id: string;
  session: number;
  date: string;
  title: string;
  category: string;
  participantNames: string[];
  sourceUrl: string;
}

export function getParliamentaryDebates(personId: string) {
  const member = importedDebates.members.find((entry) => entry.personId === personId);
  if (!member) return null;
  return {
    collectedOn: importedDebates.collectedAt.slice(0, 10),
    directoryUrl: importedDebates.source,
    totalRecords: member.totalRecords,
    sourcePages: member.sourcePages,
    records: member.records as ParliamentaryDebate[],
  };
}
