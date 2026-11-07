import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { summarizeParliamentaryWork, type QuestionArchive } from "./parliamentary-work";

// Questions for every sitting MP, rebuilt from saved Sansad pages by data/src/sansad-all-members-archive.ts.
// Digital Sansad reuse is still under review, so this file is local only and is never deployed.

// Kept once read; a missing file is looked for again, so a local archive added later is picked up.
let archive: QuestionArchive | undefined;

export function getMemberQuestions(memberId: number, path = process.env.SANSAD_QUESTIONS_FILE ?? resolve(process.cwd(), "../data/raw/sansad-questions/archive-all-members.json")) {
  if (!archive) {
    try {
      archive = JSON.parse(readFileSync(path, "utf8")) as QuestionArchive;
    } catch {
      return null;
    }
  }
  return summarizeParliamentaryWork(archive, `sansad-${memberId}`);
}
