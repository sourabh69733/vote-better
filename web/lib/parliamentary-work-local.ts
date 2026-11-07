import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { summarizeParliamentaryWork, type QuestionArchive } from "./parliamentary-work";

// Questions for every sitting MP, rebuilt from saved Sansad pages by data/src/sansad-all-members-archive.ts.
// Digital Sansad reuse is still under review, so this file is local only and is never deployed.

let archive: QuestionArchive | null | undefined;

export function getMemberQuestions(memberId: number, path = process.env.SANSAD_QUESTIONS_FILE ?? resolve(process.cwd(), "../data/raw/sansad-questions/archive-all-members.json")) {
  if (archive === undefined) {
    try {
      archive = JSON.parse(readFileSync(path, "utf8")) as QuestionArchive;
    } catch {
      archive = null;
    }
  }
  return archive ? summarizeParliamentaryWork(archive, `sansad-${memberId}`) : null;
}
