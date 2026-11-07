import { createHash } from "node:crypto";
import type { BoundaryArea, SansadMember } from "./mp-crosswalk.js";
import type { QuestionTarget } from "./sansad-questions.js";

export interface CrosswalkReviewInput {
  schemaVersion: number;
  reviewStatus: string;
  boundarySource: { inputSha256: string; url?: string; checkedAt?: string; upstreamUrl?: string };
  rosterSnapshots: { id: string; contentHash: string; url?: string; capturedAt?: string }[];
  areas: Record<string, BoundaryArea>;
  members: SansadMember[];
  proposed: { areaId: string; memberId: number }[];
  suggested: { areaId: string; memberId: number; reason: string }[];
}

export interface MpLinkQueue {
  schemaVersion: 1;
  boundarySource: CrosswalkReviewInput["boundarySource"];
  rosterSnapshots: CrosswalkReviewInput["rosterSnapshots"];
  questionDirectoryHash: string;
  questionDirectorySource: string;
  matches: {
    areaId: string;
    areaLabel: string;
    areaState: string;
    memberId: number;
    memberName: string;
    officialName: string;
    constituency: string;
    memberState: string;
    party: string;
    rosterSnapshotId: string;
    matchKind: "exact" | "suggested";
    suggestionReason?: string;
    reviewToken: string;
  }[];
}

export interface MpLinkDecision {
  decision: "pending" | "approve" | "reject";
  areaId: string;
  memberId: number;
  reviewToken: string;
  personId?: string;
  reviewer?: string;
  reviewedAt?: string;
  reason?: string;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function validReviewDate(value: string): boolean {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}

export function prepareMpLinkQueue(report: CrosswalkReviewInput, questionDirectory: unknown, questionDirectoryHash: string): MpLinkQueue {
  if (report?.schemaVersion !== 1 || report.reviewStatus !== "unreviewed" || !report.boundarySource?.inputSha256 ||
      !Array.isArray(report.rosterSnapshots) || !report.rosterSnapshots.length || !questionDirectoryHash) {
    throw new Error("invalid crosswalk or source hashes");
  }
  if (!Array.isArray(questionDirectory)) throw new Error("invalid question directory");
  const officialNames = new Map<number, string>();
  const seenNames = new Set<string>();
  for (const row of questionDirectory) {
    if (!Number.isSafeInteger(row?.mpNo) || row.mpNo < 1 || typeof row.mpName !== "string" || !row.mpName.trim() ||
        officialNames.has(row.mpNo) || seenNames.has(row.mpName)) throw new Error("invalid or duplicate question directory identity");
    officialNames.set(row.mpNo, row.mpName);
    seenNames.add(row.mpName);
  }
  const snapshots = new Map(report.rosterSnapshots.map((item) => [item.id, item.contentHash]));
  if (snapshots.size !== report.rosterSnapshots.length || [...snapshots.values()].some((value) => !value)) throw new Error("invalid roster snapshots");
  const members = new Map(report.members.map((member) => [member.id, member]));
  if (members.size !== report.members.length) throw new Error("duplicate crosswalk member");
  const seenAreas = new Set<string>();
  const seenMembers = new Set<number>();
  const matches: MpLinkQueue["matches"] = [];
  for (const match of [
    ...report.proposed.map((item) => ({ ...item, matchKind: "exact" as const })),
    ...report.suggested.map((item) => ({ ...item, matchKind: "suggested" as const })),
  ]) {
    const area = report.areas[match.areaId];
    const member = members.get(match.memberId);
    const officialName = officialNames.get(match.memberId);
    const rosterHash = member && snapshots.get(member.snapshotId);
    if (!area?.label?.trim() || !area.state?.trim() || !member || member.status.toLowerCase() !== "sitting" ||
        !rosterHash || !officialName || seenAreas.has(match.areaId) || seenMembers.has(match.memberId)) {
      throw new Error(`invalid or ambiguous crosswalk match ${match.areaId}/${match.memberId}`);
    }
    seenAreas.add(match.areaId);
    seenMembers.add(match.memberId);
    const evidence = { areaId: match.areaId, area, member, officialName, matchKind: match.matchKind,
      suggestionReason: "reason" in match ? match.reason : undefined,
      boundaryHash: report.boundarySource.inputSha256, rosterHash, questionDirectoryHash };
    matches.push({ areaId: match.areaId, areaLabel: area.label, areaState: area.state,
      memberId: member.id, memberName: member.name, officialName, constituency: member.constituency,
      memberState: member.state, party: member.party, rosterSnapshotId: member.snapshotId, matchKind: match.matchKind,
      ...(match.matchKind === "suggested" ? { suggestionReason: match.reason } : {}), reviewToken: hash(evidence) });
  }
  matches.sort((a, b) => a.areaId.localeCompare(b.areaId));
  return { schemaVersion: 1, boundarySource: report.boundarySource, rosterSnapshots: report.rosterSnapshots,
    questionDirectoryHash, questionDirectorySource: "https://sansad.in/api_ls/question/getMembers?lkNo=18", matches };
}

export function promoteMpLinks(queue: MpLinkQueue, currentQueue: MpLinkQueue, decisions: MpLinkDecision[], existing: QuestionTarget[]): QuestionTarget[] {
  if (queue?.schemaVersion !== 1 || currentQueue?.schemaVersion !== 1 || !Array.isArray(decisions) || !Array.isArray(existing)) {
    throw new Error("invalid promotion input");
  }
  if (queue.questionDirectoryHash !== currentQueue.questionDirectoryHash ||
      JSON.stringify(queue.boundarySource) !== JSON.stringify(currentQueue.boundarySource) ||
      JSON.stringify(queue.rosterSnapshots) !== JSON.stringify(currentQueue.rosterSnapshots)) {
    throw new Error("stale review sources");
  }
  const current = new Map(currentQueue.matches.map((row) => [`${row.areaId}:${row.memberId}`, row]));
  const reviewed = new Map(queue.matches.map((row) => [`${row.areaId}:${row.memberId}`, row]));
  const byMember = new Map<number, QuestionTarget>();
  const personIds = new Set<string>();
  const officialNames = new Set<string>();
  for (const target of existing) {
    if (!target.personId || !Number.isSafeInteger(target.memberId) || !target.officialName ||
        byMember.has(target.memberId) || personIds.has(target.personId) || officialNames.has(target.officialName)) {
      throw new Error("invalid existing targets");
    }
    byMember.set(target.memberId, target);
    personIds.add(target.personId);
    officialNames.add(target.officialName);
  }
  const seenDecisions = new Set<string>();
  const additions: QuestionTarget[] = [];
  for (const decision of decisions) {
    const key = `${decision.areaId}:${decision.memberId}`;
    if (seenDecisions.has(key)) throw new Error(`duplicate decision ${key}`);
    seenDecisions.add(key);
    const row = reviewed.get(key);
    const latest = current.get(key);
    if (!row || !latest || JSON.stringify(row) !== JSON.stringify(latest) || decision.reviewToken !== row.reviewToken) {
      throw new Error(`stale or unknown review decision ${key}`);
    }
    if (decision.decision === "pending") continue;
    if (!decision.reviewer?.trim() || !decision.reason?.trim() || !validReviewDate(decision.reviewedAt ?? "") ||
        (decision.decision !== "approve" && decision.decision !== "reject")) throw new Error(`invalid review audit ${key}`);
    if (decision.decision === "reject") continue;
    if (!decision.personId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(decision.personId)) throw new Error(`invalid person ID ${key}`);
    const previous = byMember.get(row.memberId);
    if (previous) {
      if (previous.personId !== decision.personId || previous.officialName !== row.officialName) {
        throw new Error(`approval conflicts with existing target ${row.memberId}`);
      }
      continue;
    }
    if (personIds.has(decision.personId)) throw new Error(`duplicate person ID ${decision.personId}`);
    if (officialNames.has(row.officialName)) throw new Error(`duplicate official name ${row.officialName}`);
    const target = { personId: decision.personId, memberId: row.memberId, officialName: row.officialName };
    byMember.set(row.memberId, target);
    personIds.add(target.personId);
    officialNames.add(target.officialName);
    additions.push(target);
  }
  return [...existing, ...additions.sort((a, b) => a.memberId - b.memberId)];
}
