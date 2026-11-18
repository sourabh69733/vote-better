import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import importedDebates from "@/records/imported/lok-sabha-18-debates.json";

export interface ParliamentaryDebate {
  id: string;
  session: number;
  date: string;
  title: string;
  category: string;
  participantNames: string[];
  sourceUrl: string;
}

export function getParliamentaryDebates(personId: string) {
  const member = importedDebates.members.find((entry) => entry.personId === personId);
  if (!member) return null;
  return {
    collectedOn: importedDebates.collectedAt.slice(0, 10),
    directoryUrl: importedDebates.source,
    totalRecords: member.totalRecords,
    sourcePages: member.sourcePages,
    records: member.records as ParliamentaryDebate[],
  };
}

// Debates for every sitting MP, built by data/src/sansad-debates-all.ts. Digital Sansad reuse is still under
// review, so this archive is local only and is never deployed.
interface DebateArchive { collectedAt: string; source: string; members: { memberId: number; totalRecords: number; records: ParliamentaryDebate[] }[] }
// Kept once read; a missing file is looked for again, so a local archive added later is picked up.
let archive: DebateArchive | undefined;

export function getLocalMemberDebates(memberId: number, path = process.env.SANSAD_DEBATES_FILE ?? resolve(process.cwd(), "../data/raw/sansad-debates/archive-all-members.json")) {
  if (!archive) {
    try {
      archive = JSON.parse(readFileSync(path, "utf8")) as DebateArchive;
    } catch {
      return null;
    }
  }
  const member = archive.members.find((entry) => entry.memberId === memberId);
  if (!member) return null;
  return { collectedOn: archive.collectedAt.slice(0, 10), directoryUrl: archive.source, totalRecords: member.totalRecords, records: member.records };
}
