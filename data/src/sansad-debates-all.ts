import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildDebatePublication, debatePageUrl, DEBATE_PAGE_SIZE, type DebatePublication } from "./sansad-debates.js";
import { fetchText } from "./sansad-questions.js";
import { loadRoster } from "./sansad-sessions.js";

// Debates for every sitting MP, from Digital Sansad's debate search. Each member's pages are saved once,
// so an interrupted run resumes. Digital Sansad reuse is still under review, so the pages and the archive
// stay in ignored data/raw and are not published.

const raw = (...parts: string[]) => fileURLToPath(new URL(`../raw/sansad-debates/${parts.join("/")}`, import.meta.url));
export const ALL_MEMBERS_DEBATES = raw("archive-all-members.json");

interface Member { mpNo: number; mpName: string }

const total = (body: string) => JSON.parse(body)?._metadata?.totalElements as number;

// With `recheck`, page 1 is fetched again: if the member's total has changed, every page is fetched again,
// so new debates are picked up; if not, the saved pages stand.
async function memberPages(memberId: number, pauseMs: number, request?: typeof fetch, recheck = false) {
  const pages: { url: string; body: string; file: string }[] = [];
  let fetched = 0;
  let stale = false;
  if (recheck) {
    const savedFirst = await readFile(raw("all", `member-${memberId}-page-1.json`), "utf8").catch(() => null);
    const fresh = await fetchText(debatePageUrl(memberId, 1), request);
    fetched++;
    await new Promise((done) => setTimeout(done, pauseMs));
    stale = savedFirst === null || total(savedFirst) !== total(fresh);
    if (stale) {
      const file = raw("all", `member-${memberId}-page-1.json`);
      await writeFile(`${file}.tmp`, fresh);
      await rename(`${file}.tmp`, file);
    }
  }
  for (let number = 1; ; number++) {
    const url = debatePageUrl(memberId, number);
    const file = raw("all", `member-${memberId}-page-${number}.json`);
    let body = stale && number > 1 ? null : await readFile(file, "utf8").catch(() => null);
    if (body === null) {
      body = await fetchText(url, request);
      if (!Number.isSafeInteger(JSON.parse(body)?._metadata?.totalElements)) throw new Error(`invalid debate page ${url}`);
      await writeFile(`${file}.tmp`, body);
      await rename(`${file}.tmp`, file);
      fetched++;
      await new Promise((done) => setTimeout(done, pauseMs));
    }
    pages.push({ url, body, file });
    if (number * DEBATE_PAGE_SIZE >= JSON.parse(body)._metadata.totalElements) break;
  }
  return { pages, fetched };
}

// A member whose records do not carry their roster name and number is left out and reported, not guessed.
export function buildAllMembersDebates(inputs: { member: Member; pages: { url: string; body: string }[] }[], roster: Member[], collectedAt: string) {
  const members: DebatePublication["members"] = [];
  const excluded: { mpNo: number; mpName: string; reason: string }[] = [];
  for (const { member, pages } of inputs) {
    try {
      const target = { personId: `sansad-${member.mpNo}`, memberId: member.mpNo, officialName: member.mpName };
      members.push(...buildDebatePublication([{ target, pages }], roster, collectedAt).members);
    } catch (error) {
      excluded.push({ ...member, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  const archive: DebatePublication = { lokSabha: 18, collectedAt, source: "https://sansad.in/ls/debates/digitized", members };
  return { archive, excluded };
}

// Every current member's debates. With `recheck`, each member's first page is fetched again to find
// members with new debates; without it, only members never saved are fetched.
export async function updateAllMembersDebates(options: { recheck?: boolean; pauseMs?: number } = {}) {
  const roster = await loadRoster();
  await mkdir(raw("all"), { recursive: true });
  const inputs: { member: Member; pages: { url: string; body: string }[] }[] = [];
  let fetched = 0;
  let latest = 0;
  for (const member of roster) {
    const result = await memberPages(member.mpNo, options.pauseMs ?? 700, undefined, options.recheck);
    fetched += result.fetched;
    for (const page of result.pages) latest = Math.max(latest, (await stat(page.file)).mtimeMs);
    inputs.push({ member, pages: result.pages });
  }
  const { archive, excluded } = buildAllMembersDebates(inputs, roster, new Date(latest).toISOString());
  await writeFile(`${ALL_MEMBERS_DEBATES}.tmp`, `${JSON.stringify(archive)}\n`);
  await rename(`${ALL_MEMBERS_DEBATES}.tmp`, ALL_MEMBERS_DEBATES);
  return { archive, excluded, fetched };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { archive, excluded, fetched } = await updateAllMembersDebates({ recheck: process.argv.includes("--recheck") });
  const records = archive.members.reduce((sum, member) => sum + member.totalRecords, 0);
  console.log(`${fetched} pages fetched; ${archive.members.length} members, ${records} member-debate records written to ${ALL_MEMBERS_DEBATES}.`);
  for (const item of excluded) console.log(`  not included: ${item.mpNo} ${item.mpName} (${item.reason})`);
}
