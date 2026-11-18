import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import type { BlobStore } from "./blob-store.js";
import { PORTAL, seatListUrl, type Fetcher, type NominationTarget } from "./eci-nominations.js";
import { readableName } from "./export-lok-sabha-2024.js";
import { abstractPage, AFFIDAVIT_VERSION, parseContestingProfiles, parsePortalProfile, type PortalProfile } from "./normalize/eci-affidavit.js";
import { parseNominationPage } from "./normalize/eci-nominations.js";
import { collectDocument, PDF_DOCUMENT } from "./sources/collect-document.js";
import type { CivicStore, ObservationDraft } from "./store.js";

// Collects the sworn affidavits of the candidates in one seat: keeps each scan in the private blob
// store, saves the age typed on the portal as a draft for review, and lists which page of each scan
// holds the abstract, for the person who reads its figures. Publishing waits on decision 6.

const run = promisify(execFile);

// The Hindi model is not in a default Tesseract install; see "Candidate affidavits" in data/README.md.
const TESSDATA = fileURLToPath(new URL("../tessdata/", import.meta.url));
const WORKLISTS = fileURLToPath(new URL("../raw/affidavits/", import.meta.url));

export interface AffidavitSeat {
  electionId: string;
  stateName: string;
  electionType: string;
  election: string;
  state: string;
  seat: number;
  seatName: string;
  phase: number;
}

// Jaipur first: its hand-checked disclosures show how good the collection is.
export const AFFIDAVIT_SEATS: AffidavitSeat[] = [
  { electionId: "lok-sabha-2024", stateName: "Rajasthan", electionType: "24-PC-GENERAL-1-46", election: "24-PC-GENERAL-1-46", state: "S20", seat: 7, seatName: "Jaipur", phase: 1 },
  { electionId: "lok-sabha-2024", stateName: "Rajasthan", electionType: "24-PC-GENERAL-1-46", election: "24-PC-GENERAL-1-46", state: "S20", seat: 6, seatName: "Jaipur Rural", phase: 1 },
];

// The OCR text of a scan, page by page.
export type PageReader = (pdf: Buffer) => Promise<string[]>;

export async function ocrPages(pdf: Buffer, batch = 6): Promise<string[]> {
  const directory = await mkdtemp(path.join(tmpdir(), "affidavit-"));
  try {
    const file = path.join(directory, "filing.pdf");
    await writeFile(file, pdf);
    const { stdout } = await run("pdfinfo", [file]);
    const total = Number(stdout.match(/^Pages:\s*(\d+)/m)?.[1]);
    if (!total) throw new Error("could not count the pages in the PDF");
    const data = existsSync(path.join(TESSDATA, "hin.traineddata")) ? ["--tessdata-dir", TESSDATA] : [];
    const read = async (number: number) => {
      const prefix = path.join(directory, `page-${number}`);
      await run("pdftoppm", ["-r", "200", "-gray", "-f", String(number), "-l", String(number), "-singlefile", file, prefix]);
      const text = await run("tesseract", [`${prefix}.pgm`, "stdout", ...data, "-l", "hin+eng", "--dpi", "200", "--psm", "6"], {
        env: { ...process.env, OMP_THREAD_LIMIT: "1" }, maxBuffer: 50_000_000,
      });
      await rm(`${prefix}.pgm`);
      return text.stdout;
    };
    const pages: string[] = [];
    for (let start = 1; start <= total; start += batch) {
      const numbers = Array.from({ length: Math.min(batch, total - start + 1) }, (_, index) => start + index);
      pages.push(...await Promise.all(numbers.map(read)));
    }
    return pages;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export interface AffidavitIdentity { seat: AffidavitSeat; ballot: number; profile: PortalProfile }

const identity = ({ seat, ballot, profile }: AffidavitIdentity) => ({
  election: seat.electionId, state: seat.stateName, seat: seat.seatName, seatNumber: seat.seat, ballot,
  name: readableName(profile.name), sourceName: profile.name, party: profile.party, affidavitId: profile.affidavitId,
});

// Age is typed on the portal by the returning officer's office, so it needs no OCR.
export function profileDrafts(who: AffidavitIdentity, normalizedAt: string): ObservationDraft[] {
  if (who.profile.age === null) return [];
  return [{
    locator: "portal profile, Candidate Personal Details, Age", predicate: "filing.age", rawValue: String(who.profile.age),
    normalizedValue: { ...identity(who), value: who.profile.age, ...(who.profile.gender ? { gender: who.profile.gender } : {}) },
    normalizedAt, normalizerVersion: AFFIDAVIT_VERSION,
  }];
}

export interface WorklistEntry {
  ballot: number;
  name: string;
  party: string;
  affidavitId: number;
  sourceUrl: string;
  blobRef: string;
  pages: number;
  // Where the abstract starts. Null when OCR could not find it: a person looks through the scan.
  abstractPage: number | null;
}

export interface SeatAffidavitResult {
  seat: string;
  drafts: number;
  worklist: WorklistEntry[];
  failed: { ballot: number; name: string; reason: string }[];
}

export interface AffidavitOptions {
  fetchPage: Fetcher;
  blobs: BlobStore;
  readPages?: PageReader;
  fetcher?: typeof fetch;
  log?: (message: string) => void;
}

export async function collectSeatAffidavits(store: CivicStore, seat: AffidavitSeat, options: AffidavitOptions): Promise<SeatAffidavitResult> {
  const { fetchPage, blobs, readPages = ocrPages, fetcher = fetch, log = () => {} } = options;
  const target = { electionType: seat.electionType } as NominationTarget;
  const contesting = [];
  let expected = 0;
  for (let page = 1; page <= 50; page++) {
    const html = await fetchPage(seatListUrl(target, seat.election, seat.state, seat.seat, seat.phase, "100", page));
    expected = parseNominationPage(html).counts.contesting;
    const found = parseContestingProfiles(html);
    contesting.push(...found);
    if (!found.length || contesting.length >= expected) break;
  }
  if (contesting.length !== expected) throw new Error(`${seat.seatName}: read ${contesting.length} candidates, the portal counts ${expected}`);

  const result: SeatAffidavitResult = { seat: seat.seatName, drafts: 0, worklist: [], failed: [] };
  const seatUrl = seatListUrl(target, seat.election, seat.state, seat.seat, seat.phase, "");
  for (const { ballot, name, profileUrl } of contesting) {
    const fail = (reason: string) => { result.failed.push({ ballot, name, reason }); log(`${name}: ${reason}`); };
    try {
      const profile = parsePortalProfile(await fetchPage(profileUrl));
      // The links change on every request, so the source is named by the seat's list and the portal's own number.
      const sourceUrl = `${seatUrl}#affidavit-${profile.affidavitId}`;
      const source = await store.saveSource({ authority: "Election Commission of India", documentType: `Form 26 affidavit, ${seat.seatName}, ${seat.electionId}`, url: sourceUrl });
      const collected = await collectDocument(source, store, PDF_DOCUMENT, {
        blobStore: blobs, maxBytes: 80_000_000, timeoutMs: 180_000, minIntervalMs: 1_000,
        fetcher: (_url, init) => fetcher(`${PORTAL}/affidavit-pdf-download/${profile.downloadToken}`, init),
      });
      if (collected.status === "failed") { fail(collected.reason); continue; }

      // The typed fields get their own snapshot holding those fields only, without the page's home address.
      const typed = Buffer.from(JSON.stringify({ name: profile.name, party: profile.party, age: profile.age, gender: profile.gender, affidavitId: profile.affidavitId }));
      const profileSource = await store.saveSource({ authority: "Election Commission of India", documentType: `Candidate profile, ${seat.seatName}, ${seat.electionId}`, url: `${seatUrl}#profile-${profile.affidavitId}` });
      const profileSnapshot = await store.saveSnapshot(profileSource.id, profileSource.url, `sha256:${createHash("sha256").update(typed).digest("hex")}`, new Date().toISOString(), await blobs.put(typed));
      result.drafts += (await store.saveObservations(profileSnapshot.id, profileDrafts({ seat, ballot, profile }, new Date().toISOString()))).length;

      const pages = await readPages(await blobs.get(collected.snapshot.blobRef!));
      const page = abstractPage(pages);
      result.worklist.push({ ballot, name: readableName(profile.name), party: profile.party, affidavitId: profile.affidavitId, sourceUrl, blobRef: collected.snapshot.blobRef!, pages: pages.length, abstractPage: page });
      log(`${name}: ${pages.length} pages, abstract ${page ? `from page ${page}` : "not found"}`);
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  }
  return result;
}

// Names and page numbers for the person reading the scans. Stays under ignored data/raw/.
export async function writeWorklist(result: SeatAffidavitResult, seat: AffidavitSeat, directory = WORKLISTS): Promise<string> {
  const file = path.join(directory, `${seat.electionId}-${seat.state}-${seat.seat}.json`);
  await mkdir(directory, { recursive: true });
  await writeFile(`${file}.tmp`, `${JSON.stringify({ electionId: seat.electionId, seat: seat.seatName, candidates: result.worklist, failed: result.failed }, null, 2)}\n`);
  await rename(`${file}.tmp`, file);
  return file;
}
