import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { collectQuestions, verifyCachedQuestionPublication, type QuestionPublication, type QuestionTarget } from "./sansad-questions.js";

export interface QuestionArchive {
  lokSabha: number;
  sessions: QuestionPublication[];
}

export function buildQuestionArchive(publications: QuestionPublication[], expectedSessions: number[]): QuestionArchive {
  if (!expectedSessions.length || new Set(expectedSessions).size !== expectedSessions.length || expectedSessions.some((session) => !Number.isSafeInteger(session) || session < 1)) {
    throw new Error("Invalid requested sessions");
  }
  const bySession = new Map<number, QuestionPublication>();
  for (const publication of publications) {
    if (bySession.has(publication.session)) throw new Error(`Duplicate session ${publication.session}`);
    if (publication.lokSabha !== 18) throw new Error("Unexpected Lok Sabha number");
    if (publication.sourcePages.reduce((sum, page) => sum + page.count, 0) !== publication.totalSessionQuestions) {
      throw new Error(`Incomplete session ${publication.session}`);
    }
    bySession.set(publication.session, publication);
  }
  for (const session of expectedSessions) if (!bySession.has(session)) throw new Error(`Missing session ${session}`);
  if (bySession.size !== expectedSessions.length) throw new Error("Archive includes an unrequested session");
  const sessions = [...bySession.values()].sort((a, b) => a.session - b.session);
  const identities = sessions[0].members.map(({ personId, memberId, officialName }) => ({ personId, memberId, officialName }));
  const seenQuestions = new Set<string>();
  for (const publication of sessions) {
    if (publication.members.length !== identities.length || publication.members.some((member, index) =>
      member.personId !== identities[index].personId || member.memberId !== identities[index].memberId || member.officialName !== identities[index].officialName)) {
      throw new Error(`Member identity changed in session ${publication.session}`);
    }
    for (const member of publication.members) for (const question of member.questions) {
      const key = `${publication.session}:${member.memberId}:${question.id}`;
      if (seenQuestions.has(key)) throw new Error(`Duplicate member question ${key}`);
      seenQuestions.add(key);
    }
  }
  return { lokSabha: 18, sessions };
}

async function loadCachedQuestionPublication(session: number, targets: QuestionTarget[]): Promise<QuestionPublication | null> {
  const directory = path.resolve("raw", "sansad-questions", `ls18-s${session}`);
  let cached: QuestionPublication;
  try {
    cached = JSON.parse(await readFile(path.join(directory, "publication.json"), "utf8")) as QuestionPublication;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  if (cached.session !== session) throw new Error(`Cached session mismatch: ${session}`);
  const pages = await Promise.all(cached.sourcePages.map(async (page, index) => ({
    url: page.url, body: await readFile(path.join(directory, `page-${index + 1}.json`), "utf8"),
  })));
  const members = JSON.parse(await readFile(path.join(directory, "members.json"), "utf8"));
  return verifyCachedQuestionPublication(cached, pages, members, targets);
}

export async function collectQuestionArchive(sessions: number[], output: string, targets: QuestionTarget[], resume = false): Promise<QuestionArchive> {
  const publications: QuestionPublication[] = [];
  for (const session of sessions) {
    const privateOutput = path.resolve("raw", "sansad-questions", `ls18-s${session}`, "publication.json");
    const publication = (resume && await loadCachedQuestionPublication(session, targets)) || await collectQuestions(session, privateOutput, targets);
    publications.push(publication);
    console.log(`Session ${session}: ${publication.totalSessionQuestions} feed records; ${publication.members.map((member) => `${member.memberId}=${member.questions.length}`).join(", ")}`);
  }
  const archive = buildQuestionArchive(publications, sessions);
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.tmp`;
  await writeFile(temporary, `${JSON.stringify(archive, null, 2)}\n`);
  await rename(temporary, output);
  return archive;
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  const resume = process.argv.includes("--resume");
  const sessions = process.argv.slice(2).filter((arg) => arg !== "--resume").map(Number);
  const output = path.resolve("../web/records/imported/lok-sabha-18-question-archive.json");
  const targetPath = path.resolve("config", "sansad-question-targets.json");
  readFile(targetPath, "utf8").then((contents) => JSON.parse(contents) as QuestionTarget[])
    .then((targets) => collectQuestionArchive(sessions, output, targets, resume))
    .then((archive) => console.log(`Published ${archive.sessions.length} complete sessions to ${output}`))
    .catch((error) => { console.error(error); process.exitCode = 1; });
}
