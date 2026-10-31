import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchText, type QuestionTarget } from "./sansad-questions.js";

const API = "https://sansad.in/api_ls/debate/debate-search";
const PAGE_SIZE = 100;

export interface PublishedDebate {
  id: string;
  session: number;
  date: string;
  title: string;
  category: string;
  participantNames: string[];
  sourceUrl: string;
}

export interface DebatePublication {
  lokSabha: number;
  collectedAt: string;
  source: string;
  members: {
    personId: string;
    memberId: number;
    officialName: string;
    totalRecords: number;
    sourcePages: { url: string; sha256: string; count: number }[];
    records: PublishedDebate[];
  }[];
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function debateDate(value: unknown): string {
  const match = clean(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) throw new Error("Invalid debate date");
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  if (new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) !== iso) throw new Error("Invalid debate date");
  return iso;
}

export function normalizeDebate(row: Record<string, unknown>, target: QuestionTarget): PublishedDebate {
  if (row.loksabha !== 18) throw new Error("Debate belongs to another Lok Sabha");
  const session = Number(row.session);
  const dbSlno = Number(row.dbSlno);
  if (!Number.isSafeInteger(session) || session < 1 || !Number.isSafeInteger(dbSlno) || dbSlno < 1) throw new Error("Invalid debate identifier");
  const title = clean(row.debateTitle);
  if (!title) throw new Error("Debate has no title");
  const participantNames = Array.isArray(row.memberName) ? row.memberName.map(clean).filter(Boolean) : [];
  const participants = Array.isArray(row.mpPartDetailList) ? row.mpPartDetailList : [];
  if (!participantNames.includes(target.officialName) || !participants.some((item) => item?.mpCode === target.memberId && item?.mpName === target.officialName)) {
    throw new Error(`Member identity mismatch in debate ${dbSlno}`);
  }
  return {
    id: `ls18-debate-${dbSlno}`,
    session,
    date: debateDate(row.debateDate),
    title,
    category: clean(row.debateTypeDesc),
    participantNames,
    sourceUrl: `https://sansad.in/ls/debates/view-debate?ls=18&session=${session}&dbslno=${dbSlno}`,
  };
}

export function buildDebatePublication(
  inputs: { target: QuestionTarget; pages: { url: string; body: string }[] }[],
  roster: unknown,
  collectedAt: string,
): DebatePublication {
  if (!Array.isArray(roster)) throw new Error("Invalid member directory");
  if (!inputs.length || new Set(inputs.map((input) => input.target.memberId)).size !== inputs.length) throw new Error("Duplicate or missing member targets");
  const members = inputs.map(({ target, pages }) => {
    const identity = roster.filter((row) => row?.mpNo === target.memberId);
    if (identity.length !== 1 || identity[0]?.mpName !== target.officialName) throw new Error(`Member identity mismatch: ${target.memberId}`);
    let total = -1;
    const records: PublishedDebate[] = [];
    const sourcePages: DebatePublication["members"][number]["sourcePages"] = [];
    const seen = new Set<string>();
    for (const [index, page] of pages.entries()) {
      const payload = JSON.parse(page.body);
      const meta = payload?._metadata;
      if (!Array.isArray(payload?.records) || !Number.isSafeInteger(meta?.totalElements) || meta?.currentPageNumber !== index + 1) {
        throw new Error(`Invalid debate page: ${page.url}`);
      }
      if (total !== -1 && total !== meta.totalElements) throw new Error("Debate total changed during collection");
      total = meta.totalElements;
      sourcePages.push({ url: page.url, sha256: createHash("sha256").update(page.body).digest("hex"), count: payload.records.length });
      for (const row of payload.records) {
        const debate = normalizeDebate(row, target);
        if (seen.has(debate.id)) throw new Error(`Duplicate debate: ${debate.id}`);
        seen.add(debate.id);
        records.push(debate);
      }
    }
    if (total < 0 || records.length !== total) throw new Error(`Incomplete debate feed for ${target.memberId}: ${records.length} of ${total}`);
    records.sort((a, b) => b.date.localeCompare(a.date) || b.session - a.session || a.id.localeCompare(b.id));
    return { ...target, totalRecords: total, sourcePages, records };
  });
  return { lokSabha: 18, collectedAt, source: "https://sansad.in/ls/debates/digitized", members };
}

function pageUrl(memberId: number, page: number): string {
  const query = new URLSearchParams({
    loksabha: "18", sessionNumber: "", mpCode: String(memberId), debateTypeId: "",
    searchKeyword: "", fromDate: "", toDate: "", debateKeyword: "",
    page: String(page), size: String(PAGE_SIZE), locale: "en", house: "LS",
  });
  return `${API}?${query}`;
}

export async function collectDebates(output: string, targets: QuestionTarget[]): Promise<DebatePublication> {
  const roster = JSON.parse(await fetchText("https://sansad.in/api_ls/question/getMembers?lkNo=18"));
  const inputs: { target: QuestionTarget; pages: { url: string; body: string }[] }[] = [];
  for (const target of targets) {
    const pages: { url: string; body: string }[] = [];
    for (let pageNumber = 1; ; pageNumber++) {
      const url = pageUrl(target.memberId, pageNumber);
      const body = await fetchText(url);
      pages.push({ url, body });
      const meta = JSON.parse(body)?._metadata;
      if (!Number.isSafeInteger(meta?.totalElements)) throw new Error(`Invalid debate page ${pageNumber}`);
      if (pageNumber * PAGE_SIZE >= meta.totalElements) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    inputs.push({ target, pages });
  }
  const publication = buildDebatePublication(inputs, roster, new Date().toISOString());
  const rawDir = path.resolve("raw", "sansad-debates");
  await mkdir(rawDir, { recursive: true });
  for (const input of inputs) for (const [index, page] of input.pages.entries()) {
    await writeFile(path.join(rawDir, `member-${input.target.memberId}-page-${index + 1}.json`), page.body);
  }
  await writeFile(path.join(rawDir, "members.json"), JSON.stringify(roster));
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.tmp`;
  await writeFile(temporary, `${JSON.stringify(publication, null, 2)}\n`);
  await rename(temporary, output);
  return publication;
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  const output = path.resolve(process.argv[2] ?? "../web/records/imported/lok-sabha-18-debates.json");
  readFile(path.resolve("config", "sansad-question-targets.json"), "utf8")
    .then((contents) => JSON.parse(contents) as QuestionTarget[])
    .then((targets) => collectDebates(output, targets))
    .then((publication) => {
      for (const member of publication.members) console.log(`${member.officialName}: ${member.totalRecords} debate records`);
      console.log(`Published ${output}`);
    }).catch((error) => { console.error(error); process.exitCode = 1; });
}
