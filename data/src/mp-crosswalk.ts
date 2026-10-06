export interface BoundaryArea {
  label: string;
  state: string;
}

export interface SansadMember {
  id: number;
  name: string;
  party: string;
  constituency: string;
  state: string;
  status: string;
  snapshotId: string;
}

export interface MpCrosswalk {
  proposed: { areaId: string; memberId: number }[];
  suggested: { areaId: string; memberId: number; reason: "seat-suffix" | "state-alias" | "seat-suffix-and-state-alias" }[];
  ambiguousAreas: { areaId: string; memberIds: number[] }[];
  ambiguousMembers: { memberId: number; areaIds: string[] }[];
  unmatchedAreaIds: string[];
  unmatchedMemberIds: number[];
}

function normalized(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase();
}

function key(state: string, constituency: string): string {
  return `${normalized(state)}\u0000${normalized(constituency)}`;
}

function suggestionKey(state: string, constituency: string): string {
  const stateName = normalized(state);
  const canonicalState = stateName === "ORISSA" ? "ODISHA" : stateName === "NCT OF DELHI" ? "DELHI" : stateName;
  return `${canonicalState}\u0000${normalized(constituency).replace(/\s*\((SC|ST)\)$/, "")}`;
}

export function buildMpCrosswalk(areas: Record<string, BoundaryArea>, members: readonly SansadMember[]): MpCrosswalk {
  const areaByKey = new Map<string, string[]>();
  const memberByKey = new Map<string, number[]>();
  const seenMemberIds = new Set<number>();
  for (const [id, area] of Object.entries(areas)) {
    if (!id || !area?.label?.trim() || !area.state?.trim()) throw new Error(`invalid area ${id}`);
    const group = key(area.state, area.label);
    areaByKey.set(group, [...(areaByKey.get(group) ?? []), id]);
  }
  for (const member of members) {
    if (!Number.isSafeInteger(member.id) || member.id < 1 || seenMemberIds.has(member.id) ||
        !member.name?.trim() || !member.party?.trim() || !member.constituency?.trim() ||
        !member.state?.trim() || !member.status?.trim() || !member.snapshotId?.trim()) {
      throw new Error(`invalid or repeated member ${member.id}`);
    }
    seenMemberIds.add(member.id);
    if (member.status.trim().toLowerCase() !== "sitting") continue;
    const group = key(member.state, member.constituency);
    memberByKey.set(group, [...(memberByKey.get(group) ?? []), member.id]);
  }

  const report: MpCrosswalk = {
    proposed: [], suggested: [], ambiguousAreas: [], ambiguousMembers: [], unmatchedAreaIds: [], unmatchedMemberIds: [],
  };
  for (const [areaId, area] of Object.entries(areas).sort(([a], [b]) => a.localeCompare(b))) {
    const group = key(area.state, area.label);
    const memberIds = (memberByKey.get(group) ?? []).sort((a, b) => a - b);
    if (!memberIds.length) report.unmatchedAreaIds.push(areaId);
    else if (memberIds.length === 1 && areaByKey.get(group)?.length === 1) {
      report.proposed.push({ areaId, memberId: memberIds[0] });
    } else report.ambiguousAreas.push({ areaId, memberIds });
  }
  for (const member of [...members].sort((a, b) => a.id - b.id)) {
    const group = key(member.state, member.constituency);
    const areaIds = member.status.trim().toLowerCase() === "sitting" ? (areaByKey.get(group) ?? []).sort() : [];
    if (!areaIds.length) report.unmatchedMemberIds.push(member.id);
    else if (areaIds.length !== 1 || memberByKey.get(group)?.length !== 1) {
      report.ambiguousMembers.push({ memberId: member.id, areaIds });
    }
  }
  const unmatchedAreaGroups = new Map<string, string[]>();
  const unmatchedMemberGroups = new Map<string, number[]>();
  for (const areaId of report.unmatchedAreaIds) {
    const area = areas[areaId];
    const group = suggestionKey(area.state, area.label);
    unmatchedAreaGroups.set(group, [...(unmatchedAreaGroups.get(group) ?? []), areaId]);
  }
  const byMemberId = new Map(members.map((member) => [member.id, member]));
  for (const memberId of report.unmatchedMemberIds) {
    const member = byMemberId.get(memberId)!;
    if (member.status.trim().toLowerCase() !== "sitting") continue;
    const group = suggestionKey(member.state, member.constituency);
    unmatchedMemberGroups.set(group, [...(unmatchedMemberGroups.get(group) ?? []), memberId]);
  }
  for (const areaId of report.unmatchedAreaIds) {
    const area = areas[areaId];
    const group = suggestionKey(area.state, area.label);
    const areaIds = unmatchedAreaGroups.get(group) ?? [];
    const memberIds = unmatchedMemberGroups.get(group) ?? [];
    if (areaIds.length !== 1 || memberIds.length !== 1) continue;
    const member = byMemberId.get(memberIds[0])!;
    const seatSuffix = normalized(area.label) !== normalized(member.constituency);
    const stateAlias = normalized(area.state) !== normalized(member.state);
    report.suggested.push({ areaId, memberId: member.id,
      reason: seatSuffix && stateAlias ? "seat-suffix-and-state-alias" : seatSuffix ? "seat-suffix" : "state-alias" });
  }
  const suggestedAreas = new Set(report.suggested.map((item) => item.areaId));
  const suggestedMembers = new Set(report.suggested.map((item) => item.memberId));
  report.unmatchedAreaIds = report.unmatchedAreaIds.filter((id) => !suggestedAreas.has(id));
  report.unmatchedMemberIds = report.unmatchedMemberIds.filter((id) => !suggestedMembers.has(id));
  return report;
}
