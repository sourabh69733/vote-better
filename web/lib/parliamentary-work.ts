import importedSession from "@/records/imported/lok-sabha-18-session-7.json";

export interface ParliamentaryQuestion {
  id: string;
  date: string;
  number: number;
  type: "STARRED" | "UNSTARRED";
  subject: string;
  ministry: string;
  listedMembers: string[];
  sourceUrl: string;
}

interface SessionPublication {
  lokSabha: number;
  session: number;
  collectedAt: string;
  source: string;
  totalSessionQuestions: number;
  members: { personId: string; officialName: string; questions: ParliamentaryQuestion[] }[];
}

const publication = importedSession as SessionPublication;

export function getParliamentaryWork(personId: string) {
  const member = publication.members.find((item) => item.personId === personId);
  if (!member) return null;
  return {
    lokSabha: publication.lokSabha,
    session: publication.session,
    collectedOn: publication.collectedAt.slice(0, 10),
    directoryUrl: publication.source,
    questions: member.questions,
  };
}
