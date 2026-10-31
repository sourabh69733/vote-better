import importedArchive from "@/records/imported/lok-sabha-18-question-archive.json";

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

interface QuestionArchive {
  lokSabha: number;
  sessions: {
    session: number;
    collectedAt: string;
    source: string;
    sourcePages: { url: string; sha256: string; count: number }[];
    totalSessionQuestions: number;
    members: { personId: string; questions: ParliamentaryQuestion[] }[];
  }[];
}

export function summarizeParliamentaryWork(archive: QuestionArchive, personId: string) {
  if (!archive.sessions.some((session) => session.members.some((member) => member.personId === personId))) return null;
  const sessions = archive.sessions.map((session) => {
    const questions = session.members.find((member) => member.personId === personId)?.questions ?? [];
    return { session: session.session, collectedOn: session.collectedAt.slice(0, 10), count: questions.length, sourcePages: session.sourcePages, totalSessionQuestions: session.totalSessionQuestions };
  });
  const questions = archive.sessions.flatMap((session) => (session.members.find((member) => member.personId === personId)?.questions ?? [])
    .map((question) => ({ ...question, session: session.session })))
    .sort((a, b) => b.date.localeCompare(a.date) || b.session - a.session || a.number - b.number);
  return {
    lokSabha: archive.lokSabha,
    collectedOn: sessions.reduce((latest, session) => session.collectedOn > latest ? session.collectedOn : latest, ""),
    directoryUrl: archive.sessions[0].source,
    sessions,
    questions,
  };
}

const archive = importedArchive as QuestionArchive;

export function getParliamentaryWork(personId: string) {
  return summarizeParliamentaryWork(archive, personId);
}
