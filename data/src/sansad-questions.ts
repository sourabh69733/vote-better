import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const API = "https://sansad.in/api_ls/question";
const PAGE_SIZE = 1000;
const MEMBERS = [
  { personId: "manju-sharma", memberId: 5619, officialName: "Smt. Manju Sharma" },
  { personId: "rao-rajendra-singh", memberId: 5632, officialName: "Shri Rao Rajendra Singh" },
] as const;

export interface PublishedQuestion {
  id: string;
  date: string;
  number: number;
  type: "STARRED" | "UNSTARRED";
  subject: string;
  ministry: string;
  listedMembers: string[];
  sourceUrl: string;
}

export interface QuestionPublication {
  lokSabha: number;
  session: number;
  collectedAt: string;
  source: string;
  sourcePages: { url: string; sha256: string; count: number }[];
  totalSessionQuestions: number;
  members: { personId: string; memberId: number; officialName: string; questions: PublishedQuestion[] }[];
}

type FeedRow = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function date(value: unknown): string {
  const match = text(value).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) throw new Error(`Invalid question date: ${value}`);
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  if (new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) !== iso) throw new Error(`Invalid question date: ${value}`);
  return iso;
}

function sourceUrl(value: unknown): string {
  const url = new URL(text(value));
  if (url.protocol !== "https:" || url.hostname !== "sansad.in" || !url.pathname.endsWith(".pdf")) {
    throw new Error(`Question has no official PDF: ${value}`);
  }
  return url.toString();
}

export function normalizeQuestion(row: FeedRow, lokSabha: number, session: number): PublishedQuestion {
  if (Number(row.lokNo) !== lokSabha || Number(row.sessionNo) !== session) throw new Error("Question belongs to another session");
  const number = Number(row.quesNo);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error("Invalid question number");
  const type = text(row.type);
  if (type !== "STARRED" && type !== "UNSTARRED") throw new Error(`Unsupported question type: ${type}`);
  const listedMembers = Array.isArray(row.member) ? row.member.map(text).filter(Boolean) : [];
  if (!listedMembers.length) throw new Error("Question has no listed members");
  const questionDate = date(row.date);
  const subject = text(row.subjects);
  if (!subject) throw new Error("Question has no subject");
  return {
    id: `ls${lokSabha}-s${session}-${type.toLowerCase()}-${number}-${questionDate}`,
    date: questionDate,
    number,
    type,
    subject,
    ministry: text(row.ministry),
    listedMembers,
    sourceUrl: sourceUrl(row.questionsFilePath),
  };
}

export function buildQuestionPublication(
  pages: { url: string; body: string }[],
  officialMembers: unknown,
  session: number,
  collectedAt: string,
): QuestionPublication {
  if (!Array.isArray(officialMembers)) throw new Error("Member directory is invalid");
  for (const member of MEMBERS) {
    const directoryRow = officialMembers.find((row) => row?.mpNo === member.memberId);
    if (directoryRow?.mpName !== member.officialName) throw new Error(`Member identity mismatch: ${member.memberId}`);
    if (officialMembers.filter((row) => row?.mpName === member.officialName).length !== 1) {
      throw new Error(`Member name is ambiguous: ${member.officialName}`);
    }
  }
  const sourcePages: QuestionPublication["sourcePages"] = [];
  const questions = new Map<string, PublishedQuestion>();
  const seenQuestionKeys = new Set<string>();
  let total = -1;
  for (const page of pages) {
    const payload = JSON.parse(page.body);
    const result = Array.isArray(payload) ? payload[0] : null;
    if (!result || !Array.isArray(result.listOfQuestions) || !Number.isSafeInteger(result.totalRecordSize)) {
      throw new Error(`Invalid question page: ${page.url}`);
    }
    if (total !== -1 && total !== result.totalRecordSize) throw new Error("Session total changed during collection");
    total = result.totalRecordSize;
    sourcePages.push({ url: page.url, sha256: createHash("sha256").update(page.body).digest("hex"), count: result.listOfQuestions.length });
    for (const row of result.listOfQuestions) {
      const key = `${row.lokNo}-${row.sessionNo}-${row.type}-${row.quesNo}-${row.date}`;
      if (seenQuestionKeys.has(key)) throw new Error(`Duplicate feed question: ${key}`);
      seenQuestionKeys.add(key);
      const names = Array.isArray(row.member) ? row.member.map(text) : [];
      if (!MEMBERS.some((member) => names.includes(member.officialName))) continue;
      const question = normalizeQuestion(row, 18, session);
      if (questions.has(question.id)) throw new Error(`Duplicate question: ${question.id}`);
      questions.set(question.id, question);
    }
  }
  if (total < 1 || sourcePages.reduce((sum, page) => sum + page.count, 0) !== total) {
    throw new Error(`Incomplete session: received ${sourcePages.reduce((sum, page) => sum + page.count, 0)} of ${total}`);
  }
  return {
    lokSabha: 18,
    session,
    collectedAt,
    source: "https://sansad.in/ls/questions/questions-and-answers",
    sourcePages,
    totalSessionQuestions: total,
    members: MEMBERS.map((member) => ({ ...member, questions: [...questions.values()]
      .filter((question) => question.listedMembers.includes(member.officialName))
      .sort((a, b) => b.date.localeCompare(a.date) || a.number - b.number) })),
  };
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": "VoteBetter/0.1 (public civic research)" }, signal: AbortSignal.timeout(45_000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

export async function collectQuestions(session: number, output: string): Promise<QuestionPublication> {
  if (!Number.isSafeInteger(session) || session < 1) throw new Error("Session must be a positive integer");
  const memberUrl = `${API}/getMembers?lkNo=18`;
  const officialMembers = JSON.parse(await fetchText(memberUrl));
  const pages: { url: string; body: string }[] = [];
  for (let pageNo = 1; ; pageNo++) {
    const url = `${API}/qetFilteredQuestionsAns?loksabhaNo=18&sessionNumber=${session}&pageNo=${pageNo}&pageSize=${PAGE_SIZE}&locale=en`;
    const body = await fetchText(url);
    pages.push({ url, body });
    const result = JSON.parse(body)?.[0];
    if (!result || !Array.isArray(result.listOfQuestions) || !Number.isSafeInteger(result.totalRecordSize)) throw new Error(`Invalid page ${pageNo}`);
    if (pageNo * PAGE_SIZE >= result.totalRecordSize) break;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  const publication = buildQuestionPublication(pages, officialMembers, session, new Date().toISOString());
  const rawDir = path.resolve("raw", "sansad-questions", `ls18-s${session}`);
  await mkdir(rawDir, { recursive: true });
  for (const [index, page] of pages.entries()) await writeFile(path.join(rawDir, `page-${index + 1}.json`), page.body);
  await writeFile(path.join(rawDir, "members.json"), JSON.stringify(officialMembers));
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.tmp`;
  await writeFile(temporary, `${JSON.stringify(publication, null, 2)}\n`);
  await rename(temporary, output);
  return publication;
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  const session = Number(process.argv[2] ?? 7);
  const output = path.resolve(process.argv[3] ?? `../web/records/imported/lok-sabha-18-session-${session}.json`);
  collectQuestions(session, output).then((publication) => {
    console.log(`Collected all ${publication.totalSessionQuestions} session questions in ${publication.sourcePages.length} pages.`);
    for (const member of publication.members) console.log(`${member.officialName}: ${member.questions.length} listed questions`);
    console.log(`Published ${output}`);
  }).catch((error) => { console.error(error); process.exitCode = 1; });
}
