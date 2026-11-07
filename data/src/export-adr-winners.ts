import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// What 2024 Lok Sabha winners declared, as compiled by ADR on MyNeta, for the local site only.
// Two readable copies are joined: a public dataset (github.com/AandK1412/myneta-dashboard) and one
// MyNeta winners page. Each blanks different rows: the dataset has no figures where MyNeta's seat pages
// show them as images, and the winners page replaces every ninth row with a script, which is not decoded.
// A figure the two copies disagree on is dropped. The output stays under ignored data/raw/ until ADR
// has answered; see docs/data-sources/rights-audit.md.

const RAW = fileURLToPath(new URL("../raw/", import.meta.url));
const WINNERS_PAGE = "https://www.myneta.info/LokSabha2024/index.php?action=show_winners&sort=default";

export interface DatasetRow { [column: string]: string }

export function parseCsv(text: string): DatasetRow[] {
  const rows: string[][] = [[]];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character === "\"" && text[index + 1] === "\"") { field += "\""; index++; }
      else if (character === "\"") quoted = false;
      else field += character;
    } else if (character === "\"") quoted = true;
    else if (character === ",") { rows.at(-1)!.push(field); field = ""; }
    else if (character === "\n") { rows.at(-1)!.push(field.replace(/\r$/, "")); field = ""; rows.push([]); }
    else field += character;
  }
  if (field || rows.at(-1)!.length) rows.at(-1)!.push(field);
  const [header, ...body] = rows;
  return body.filter((row) => row.length === header.length).map((row) => Object.fromEntries(header.map((column, index) => [column, row[index]])));
}

export interface PageRow { candidateId: number; name: string; constituency: string; cases: number; assets: number; liabilities: number }

const unescape = (value: string) => value.replace(/&amp;/g, "&").replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").trim();
const rupees = (value: string) => Number(value.replace(/,/g, ""));

// The general-election table only: a second table below it lists bye-election winners.
export function parseWinnersPage(html: string): PageRow[] {
  const [general] = html.split(/Lok Sabha 2024\s+Bye-Elections/);
  const row = /candidate_id=(\d+)>([^<]*)<\/a><\/a><b><\/td><td>([^<]*)<\/td>\s*<td>[^<]*<\/td>\s*<td align=center[^>]*>(.*?)<\/td>\s*<td >[^<]*<\/td>\s*<td align=right>Rs&nbsp;([\d,]+)<br>.*?<\/td>\s*<td align=right>Rs&nbsp;([\d,]+)<br>/gs;
  return [...general.matchAll(row)].map(([, id, name, constituency, cases, assets, liabilities]) => ({
    candidateId: Number(id), name: unescape(name), constituency: unescape(constituency),
    cases: Number(cases.replace(/<[^>]+>|\s/g, "")), assets: rupees(assets), liabilities: rupees(liabilities),
  }));
}

export interface AdrWinner {
  state: string;
  constituency: string;
  name: string;
  party: string;
  byElection: boolean;
  education: string | null;
  age: number | null;
  cases: number | null;
  assets: number | null;
  liabilities: number | null;
  // Which copies gave the assets and liabilities. "both" is the only one cross-checked.
  figuresFrom: "both" | "dataset" | "winners-page" | null;
  sourceUrl: string;
}

const key = (value: string) => value.toLowerCase().replace(/\((sc|st)\)/g, "").replace(/[^a-z0-9]/g, "");
const count = (value: string | undefined) => (value ? Number(value) : null);

function agreed(first: number | null, second: number | undefined) {
  if (second === undefined) return first;
  if (first === null) return second;
  return first === second ? first : null;
}

export function joinWinners(dataset: readonly DatasetRow[], page: readonly PageRow[]): AdrWinner[] {
  const pageRows = new Map(page.map((row) => [`${key(row.constituency)}|${key(row.name)}`, row]));
  return dataset.filter((row) => row.election_year === "2024" && row.is_winner === "True").map((row) => {
    const byElection = row.is_bye_election === "True";
    const seen = byElection ? undefined : pageRows.get(`${key(row.constituency)}|${key(row.name)}`);
    const [assets, liabilities] = [count(row.assets), count(row.liabilities)];
    const fromBoth = assets !== null && liabilities !== null && seen !== undefined;
    const agree = !fromBoth || (assets === seen.assets && liabilities === seen.liabilities);
    return {
      state: row.state, constituency: row.constituency, name: row.name, party: row.party, byElection,
      education: row.education ? row.education.replace(/(\d)Th\b/, "$1th") : null, age: count(row.age),
      cases: agreed(count(row.criminal_cases), seen?.cases),
      assets: agree ? assets ?? seen?.assets ?? null : null,
      liabilities: agree ? liabilities ?? seen?.liabilities ?? null : null,
      figuresFrom: !agree ? null : fromBoth ? "both" : assets !== null ? "dataset" : seen ? "winners-page" : null,
      sourceUrl: seen ? `https://www.myneta.info/LokSabha2024/candidate.php?candidate_id=${seen.candidateId}` : WINNERS_PAGE,
    };
  });
}

export async function exportAdrWinners(directory = RAW) {
  const copy = path.join(directory, "myneta-dashboard");
  const dataset = parseCsv(await readFile(path.join(copy, "candidates.csv"), "utf8"));
  const page = parseWinnersPage(await readFile(path.join(copy, "winners-page.html"), "utf8"));
  const { commit, fetchedOn } = JSON.parse(await readFile(path.join(copy, "source.json"), "utf8")) as { commit: string; fetchedOn: string };
  const winners = joinWinners(dataset, page);
  const general = winners.filter((winner) => !winner.byElection);
  if (general.length !== 543) throw new Error(`expected 543 general-election winners, read ${general.length}`);
  const file = path.join(directory, "public-profiles", "adr-winners-2024.json");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(`${file}.tmp`, `${JSON.stringify({ schemaVersion: 1, sourceLabel: "ADR/MyNeta", datasetCommit: commit, checkedOn: fetchedOn, winners }, null, 2)}\n`);
  await rename(`${file}.tmp`, file);
  return { file, winners };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { file, winners } = await exportAdrWinners();
  const counts = new Map<string, number>();
  for (const { figuresFrom } of winners) counts.set(figuresFrom ?? "none", (counts.get(figuresFrom ?? "none") ?? 0) + 1);
  console.log(`${file}: ${winners.length} winners; figures from ${[...counts].map(([from, total]) => `${from} ${total}`).join(", ")}`);
}
