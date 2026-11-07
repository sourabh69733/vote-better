import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildQuestionArchive, type QuestionArchive } from "./sansad-question-archive.js";
import { buildQuestionPublication, type QuestionTarget } from "./sansad-questions.js";

// Questions for every sitting MP, rebuilt offline from the saved Sansad session pages.
// Digital Sansad reuse is still under review, so the archive stays in data/raw and is not published.

const raw = (...parts: string[]) => fileURLToPath(new URL(`../raw/sansad-questions/${parts.join("/")}`, import.meta.url));
export const ALL_MEMBERS_ARCHIVE = raw("archive-all-members.json");

interface Member { mpNo: number; mpName: string }

// Every member listed under one unique name in every session's member list. Others are reported, not guessed.
export function memberTargets(sessions: Member[][]): { targets: QuestionTarget[]; excluded: { mpNo: number; mpName: string; reason: string }[] } {
  const excluded: { mpNo: number; mpName: string; reason: string }[] = [];
  const latest = sessions.at(-1)!;
  const nameCount = new Map<string, number>();
  for (const member of latest) nameCount.set(member.mpName, (nameCount.get(member.mpName) ?? 0) + 1);
  const targets: QuestionTarget[] = [];
  for (const member of latest) {
    if (nameCount.get(member.mpName)! > 1) { excluded.push({ ...member, reason: "name shared with another member" }); continue; }
    const everywhere = sessions.every((list) => list.some((other) => other.mpNo === member.mpNo && other.mpName === member.mpName));
    if (!everywhere) { excluded.push({ ...member, reason: "not listed under this name in every session" }); continue; }
    targets.push({ personId: `sansad-${member.mpNo}`, memberId: member.mpNo, officialName: member.mpName });
  }
  return { targets: targets.sort((a, b) => a.memberId - b.memberId), excluded };
}

export async function buildAllMembersArchive(sessions: number[]): Promise<{ archive: QuestionArchive; excluded: ReturnType<typeof memberTargets>["excluded"] }> {
  const saved = await Promise.all(sessions.map(async (session) => {
    const directory = raw(`ls18-s${session}`);
    const cached = JSON.parse(await readFile(path.join(directory, "publication.json"), "utf8")) as { collectedAt: string; sourcePages: { url: string }[] };
    const pages = await Promise.all(cached.sourcePages.map(async (page, index) => ({ url: page.url, body: await readFile(path.join(directory, `page-${index + 1}.json`), "utf8") })));
    const members = JSON.parse(await readFile(path.join(directory, "members.json"), "utf8")) as Member[];
    return { session, cached, pages, members };
  }));
  const { targets, excluded } = memberTargets(saved.map((item) => item.members));
  const publications = saved.map(({ session, cached, pages, members }) => buildQuestionPublication(pages, members, session, cached.collectedAt, targets));
  return { archive: buildQuestionArchive(publications, sessions), excluded };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const sessions = [1, 2, 3, 4, 5, 6, 7, 8];
  buildAllMembersArchive(sessions).then(async ({ archive, excluded }) => {
    const temporary = `${ALL_MEMBERS_ARCHIVE}.tmp`;
    await writeFile(temporary, `${JSON.stringify(archive)}\n`);
    await rename(temporary, ALL_MEMBERS_ARCHIVE);
    const members = archive.sessions[0].members.length;
    const questions = archive.sessions.reduce((sum, s) => sum + s.members.reduce((n, m) => n + m.questions.length, 0), 0);
    console.log(`${members} members, ${questions} member-question listings across ${archive.sessions.length} sessions written to ${ALL_MEMBERS_ARCHIVE}.`);
    for (const item of excluded) console.log(`  not included: ${item.mpNo} ${item.mpName} (${item.reason})`);
  }).catch((error) => { console.error(error); process.exitCode = 1; });
}
