import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type pg from "pg";

import { openBlobStore } from "./blob-store.js";
import { runAllBiographyBatches, rosterIds, missingBiographyIds } from "./batch-sansad-biographies.js";
import { importInitialDelhiSources } from "./delhi/import.js";
import { collectEciGe2024References, importEciGe2024 } from "./import-eci-2024.js";
import { ECI_HISTORY, importEciHistory } from "./import-eci-history.js";
import { importEciAssembly } from "./import-eci-assembly.js";
import { importRajasthanByeElections } from "./import-rajasthan-bye-elections.js";
import { ASSEMBLY_ELECTIONS, assemblyFiles } from "./normalize/eci-assembly-result.js";
import type { HistoryYear } from "./normalize/eci-history-detailed-result.js";
import { importJaipurForm21E } from "./import-jaipur.js";
import { importSansadBiography } from "./import-sansad-biography.js";
import { importSansadMembers } from "./import-sansad-members.js";
import { listCollectedBiographyIds } from "./profile-draft.js";
import { collectWorks } from "./mplads-works.js";
import { buildPublication, collectNominations, NOMINATION_TARGETS, portalFetcher, writePublication } from "./eci-nominations.js";
import { collectDebates } from "./sansad-debates.js";
import { collectQuestionArchive } from "./sansad-question-archive.js";
import { CivicStore } from "./store.js";

// Every source the pipeline collects, in one place. A source not listed here is not collected.

export type ReuseStatus =
  | "open-licence"        // published under an open licence that allows reuse
  | "to-confirm"          // government publication; the site's reuse policy still needs checking
  | "under-review"        // reuse is undecided; keep output local
  | "restricted";         // do not collect automatically

export interface RunContext {
  pool: pg.Pool;
  store: CivicStore;
  log: (message: string) => void;
}

export interface RunResult {
  outcome: "succeeded" | "partial" | "failed";
  items: number;
  detail: string;
}

export interface SourceDefinition {
  id: string;
  title: string;
  owner: string;
  url: string;
  format: "xls" | "xlsx" | "pdf" | "json" | "html";
  // How often to check. null means the source is a fixed archive checked only on request.
  refreshDays: number | null;
  reuse: { status: ReuseStatus; note: string };
  supplies: string[];
  // transcription: a person compares a hand transcription with its scanned document, one document at a time.
  review: "batch" | "per-fact" | "file-export" | "transcription";
  dependsOn?: string[];
  // Longest a run may take before the sync runner logs it as failed and moves on (default 90).
  timeoutMinutes?: number;
  // From the election's announcement to its last poll day, check this often instead of refreshDays.
  pollWindow?: { electionId: string; everyHours: number };
  run: (context: RunContext) => Promise<RunResult>;
}

const raw = (path: string) => fileURLToPath(new URL(`../raw/${path}`, import.meta.url));
const config = (path: string) => fileURLToPath(new URL(`../config/${path}`, import.meta.url));
const webImport = (path: string) => fileURLToPath(new URL(`../../web/records/imported/${path}`, import.meta.url));

async function questionTargets() {
  return JSON.parse(await readFile(config("sansad-question-targets.json"), "utf8"));
}

export const registry: SourceDefinition[] = [
  {
    id: "eci-ge2024-results",
    title: "Lok Sabha 2024 results: reports 33, 4, 3 and 2A",
    owner: "Election Commission of India",
    url: "https://www.eci.gov.in/general-election-to-loksabha-2024-statistical-reports",
    format: "xls",
    refreshDays: 30,
    reuse: { status: "to-confirm", note: "Official statistical reports; ECI notes its statutory forms are final." },
    supplies: ["candidate.result", "contest.number", "contest.reservation", "party.name"],
    review: "batch",
    async run({ store }) {
      const blobs = openBlobStore("eci-2024/blobs/");
      const result = await importEciGe2024(store, blobs);
      const references = await collectEciGe2024References(store, blobs);
      const failedReferences = references.filter((item) => item.status !== "succeeded");
      if (result.status !== "drafts-saved") return { outcome: "failed", items: 0, detail: `report 33: ${result.reason}` };
      return {
        outcome: failedReferences.length ? "partial" : "succeeded",
        items: result.observationIds.length,
        detail: `${result.seats} seats, ${result.observationIds.length} candidate rows; ${references.length - failedReferences.length}/${references.length} reference reports`,
      };
    },
  },
  ...([2019, 2014] as HistoryYear[]).map((year): SourceDefinition => ({
    id: `eci-ge${year}-results`,
    title: `Lok Sabha ${year} results: detailed result, winners and parties`,
    owner: "Election Commission of India",
    url: ECI_HISTORY[year].detailed,
    format: year === 2019 ? "xls" : "xlsx",
    refreshDays: null,
    reuse: { status: "to-confirm", note: "Archive download requires accepting ECI's note that statutory forms prevail; approved by the project owner." },
    supplies: ["candidate.result"],
    review: "batch",
    async run({ store }) {
      const result = await importEciHistory(store, openBlobStore(`eci-${year}/blobs/`), year);
      if (result.status !== "drafts-saved") return { outcome: "failed", items: 0, detail: result.reason };
      return {
        outcome: "succeeded", items: result.observationIds.length,
        detail: `${result.seats} seats with full results, ${result.winnerOnly} winner-only, ${result.notes} seats with small differences in ECI's own figures`,
      };
    },
  })),
  ...Object.values(ASSEMBLY_ELECTIONS).map((election): SourceDefinition => ({
    id: `eci-${election.id}-results`,
    title: `${election.state} assembly ${election.id.slice(-4)} results: detailed results, winners, voters and parties`,
    owner: "Election Commission of India",
    url: assemblyFiles(election).detailed,
    format: "xlsx",
    refreshDays: null,
    reuse: { status: "to-confirm", note: "Official statistical reports; ECI notes its statutory forms are final." },
    supplies: ["candidate.result"],
    review: "batch",
    async run({ store }) {
      const result = await importEciAssembly(store, openBlobStore(`${election.id}/blobs/`), election.id);
      if (result.status !== "drafts-saved") return { outcome: "failed", items: 0, detail: result.reason };
      return { outcome: "succeeded", items: result.observationIds.length, detail: `${result.seats} seats, ${result.observationIds.length} candidate rows; all reports agree; ${result.nameVariants} name spelling difference(s)` };
    },
  })),
  {
    id: "ceo-rajasthan-bye-election-returns",
    title: "Rajasthan assembly bye-elections since 2023: transcribed returns and result gazette",
    owner: "Chief Electoral Officer, Rajasthan",
    url: "https://election.rajasthan.gov.in/Bye_Election%20Nov2024/Form20_21D_21E.aspx",
    format: "pdf",
    refreshDays: null,
    reuse: { status: "to-confirm", note: "Statutory returns published by the CEO; scanned images, transcribed by hand." },
    supplies: ["candidate.result"],
    review: "transcription",
    async run({ store }) {
      const result = await importRajasthanByeElections(store, openBlobStore("rajasthan-bye-elections/blobs/"));
      const failed = result.documents.filter((document) => document.status !== "drafts-saved");
      return {
        outcome: failed.length === result.documents.length ? "failed" : failed.length ? "partial" : "succeeded",
        items: result.drafts,
        detail: `${result.documents.length - failed.length}/${result.documents.length} documents match their transcription; ${result.drafts} drafts${failed.length ? `; ${failed.map((d) => `${d.url}: ${d.reason}`).join("; ")}` : ""}`,
      };
    },
  },
  ...NOMINATION_TARGETS.map((target): SourceDefinition => ({
    id: `eci-nominations-${target.electionId}`,
    title: `Candidates and nominations: ${target.title}`,
    owner: "Election Commission of India",
    url: "https://affidavit.eci.gov.in/",
    format: "html",
    refreshDays: null,
    pollWindow: { electionId: target.electionId, everyHours: 3 },
    reuse: { status: "to-confirm", note: "ECI calls the portal's list tentative; the returning officer's list is final. Names, parties and status only; affidavit contents wait on decision 6." },
    supplies: ["candidacy.nomination", "candidacy.status", "candidacy.ballotNumber"],
    review: "file-export",
    timeoutMinutes: 180,
    async run({ log }) {
      const seats = await collectNominations(portalFetcher(openBlobStore(`eci-nominations/${target.electionId}/`)), target);
      const changed = await writePublication(buildPublication(target, seats, new Date().toISOString().slice(0, 10)));
      const candidates = seats.reduce((sum, seat) => sum + seat.candidates.length, 0);
      const contesting = seats.reduce((sum, seat) => sum + seat.candidates.filter((candidate) => candidate.status === "contesting").length, 0);
      log(changed ? "list changed; file rewritten" : "no change since the last check");
      return { outcome: "succeeded", items: candidates, detail: `${seats.length} seats, ${candidates} candidates, ${contesting} contesting` };
    },
  })),
  {
    id: "rajasthan-form21e-jaipur",
    title: "Jaipur 2024 return of election (Form 21E)",
    owner: "Chief Electoral Officer, Rajasthan",
    url: "https://election.rajasthan.gov.in/Lok_Sabha_Election_2024/ElectionResults/Form21E/Form21E-7.pdf",
    format: "pdf",
    refreshDays: null,
    reuse: { status: "to-confirm", note: "Statutory return; transcribed by hand and checked." },
    supplies: ["candidate.name", "candidate.party", "candidate.votesPolled", "contest.total*"],
    review: "per-fact",
    async run({ store }) {
      const result = await importJaipurForm21E(store);
      if (result.status === "drafts-saved") return { outcome: "succeeded", items: result.observationIds.length, detail: "transcription matches the saved PDF" };
      return { outcome: "failed", items: 0, detail: result.reason };
    },
  },
  {
    id: "sansad-ls-members",
    title: "Sitting Lok Sabha members",
    owner: "Parliament of India, Digital Sansad",
    url: "https://sansad.in/ls/members",
    format: "json",
    refreshDays: 1,
    reuse: { status: "under-review", note: "Reuse decision pending; keep exports local." },
    supplies: ["person.name", "office.seat", "office.party", "office.status"],
    review: "per-fact",
    async run({ store }) {
      const result = await importSansadMembers(store);
      if (result.status === "drafts-saved") return { outcome: "succeeded", items: result.members, detail: `${result.members} members on ${result.pages} pages` };
      return { outcome: "failed", items: 0, detail: result.reason };
    },
  },
  {
    id: "sansad-ls-biographies",
    title: "Lok Sabha member biographies",
    owner: "Parliament of India, Digital Sansad",
    url: "https://sansad.in/ls/members",
    format: "json",
    refreshDays: 7,
    reuse: { status: "under-review", note: "Reuse decision pending; keep exports local." },
    supplies: ["person.birthDate", "person.educationStatement", "person.profession", "office.positionsHeld", "person.socialProfile"],
    review: "per-fact",
    dependsOn: ["sansad-ls-members"],
    timeoutMinutes: 300,
    async run({ pool, store, log }) {
      const ids = await rosterIds(pool);
      const pending = missingBiographyIds(ids, await listCollectedBiographyIds(pool));
      if (!pending.length) return { outcome: "succeeded", items: 0, detail: `all ${ids.length} biographies already collected` };
      const blobStore = openBlobStore("sansad-biography");
      const result = await runAllBiographyBatches(pending, {
        limit: 25, collect: (memberId) => importSansadBiography(store, memberId, { blobStore }),
        onBatch: (batch) => log(`biographies: ${batch.saved} saved, ${batch.remaining} remaining`),
      });
      return { outcome: result.failed ? "partial" : "succeeded", items: result.saved, detail: `${result.saved} saved, ${result.failed} failed of ${pending.length} missing` };
    },
  },
  {
    id: "sansad-ls-questions",
    title: "Lok Sabha questions for tracked members",
    owner: "Parliament of India, Digital Sansad",
    url: "https://sansad.in/ls/questions/questions-and-answers",
    format: "json",
    refreshDays: 7,
    reuse: { status: "under-review", note: "Reuse decision pending." },
    supplies: ["activity.question"],
    review: "file-export",
    timeoutMinutes: 180,
    async run() {
      const sessions = [1, 2, 3, 4, 5, 6, 7, 8];
      const archive = await collectQuestionArchive(sessions, webImport("lok-sabha-18-question-archive.json"), await questionTargets(), true);
      const questions = archive.sessions.reduce((sum, session) => sum + session.members.reduce((count, member) => count + member.questions.length, 0), 0);
      return { outcome: "succeeded", items: questions, detail: `${archive.sessions.length} sessions, ${questions} questions` };
    },
  },
  {
    id: "sansad-ls-debates",
    title: "Lok Sabha debate records for tracked members",
    owner: "Parliament of India, Digital Sansad",
    url: "https://sansad.in/ls/debates",
    format: "json",
    refreshDays: 7,
    reuse: { status: "under-review", note: "Reuse decision pending." },
    supplies: ["activity.debate"],
    review: "file-export",
    async run() {
      const publication = await collectDebates(webImport("lok-sabha-18-debates.json"), await questionTargets());
      const records = publication.members.reduce((sum, member) => sum + member.totalRecords, 0);
      return { outcome: "succeeded", items: records, detail: `${publication.members.length} members, ${records} records` };
    },
  },
  {
    id: "mospi-mplads-works",
    title: "MP Local Area Development Scheme works for tracked members",
    owner: "Ministry of Statistics and Programme Implementation, eSAKSHI",
    url: "https://mplads.mospi.gov.in/digigov/dashboard.html",
    format: "json",
    refreshDays: 7,
    reuse: { status: "to-confirm", note: "Content owned by MoSPI; its reuse policy is not linked from the dashboard and still needs checking." },
    supplies: ["outcome.fundWork"],
    review: "file-export",
    async run() {
      const targets = JSON.parse(await readFile(config("mplads-targets.json"), "utf8"));
      const publication = await collectWorks(targets, webImport("mplads-works.json"), raw("mplads"));
      const works = publication.members.reduce((sum, member) => sum + member.works.length, 0);
      return { outcome: "succeeded", items: works, detail: `${publication.members.length} members, ${works} works` };
    },
  },
  {
    id: "delhi-directory",
    title: "Delhi government, MPs and office directory",
    owner: "Government of NCT of Delhi",
    url: "https://delhi.gov.in/",
    format: "html",
    refreshDays: 1,
    reuse: { status: "to-confirm", note: "Official directory pages; tenure and reuse still under review." },
    supplies: ["delhi.office", "delhi.appointment"],
    review: "per-fact",
    async run({ pool, store }) {
      const results = await importInitialDelhiSources(pool, store, openBlobStore("delhi/"));
      const failed = results.filter((item) => item.outcome !== "succeeded");
      return {
        outcome: failed.length === results.length ? "failed" : failed.length ? "partial" : "succeeded",
        items: results.reduce((sum, item) => sum + item.drafts, 0),
        detail: `${results.length - failed.length}/${results.length} pages collected`,
      };
    },
  },
];

export function validateRegistry(sources: readonly SourceDefinition[] = registry): void {
  const ids = new Set<string>();
  for (const source of sources) {
    if (!/^[a-z0-9-]+$/.test(source.id)) throw new Error(`invalid source id ${source.id}`);
    if (ids.has(source.id)) throw new Error(`duplicate source ${source.id}`);
    ids.add(source.id);
    if (!source.url.startsWith("https://")) throw new Error(`${source.id} needs an HTTPS URL`);
    if (source.refreshDays !== null && !(source.refreshDays > 0)) throw new Error(`${source.id} has an invalid refresh interval`);
    if (source.timeoutMinutes !== undefined && !(source.timeoutMinutes > 0)) throw new Error(`${source.id} has an invalid timeout`);
    if (source.pollWindow && !(source.pollWindow.everyHours > 0)) throw new Error(`${source.id} has an invalid poll window interval`);
    if (source.reuse.status === "restricted") throw new Error(`${source.id} is restricted and must not be collected automatically`);
    if (!source.supplies.length) throw new Error(`${source.id} must declare the fields it supplies`);
  }
  for (const source of sources) {
    for (const dependency of source.dependsOn ?? []) if (!ids.has(dependency)) throw new Error(`${source.id} depends on unknown ${dependency}`);
  }
}
