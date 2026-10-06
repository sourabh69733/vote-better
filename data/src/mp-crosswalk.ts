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
  ambiguousAreas: { areaId: string; memberIds: number[] }[];
  ambiguousMembers: { memberId: number; areaIds: string[] }[];
  unmatchedAreaIds: string[];
  unmatchedMemberIds: number[];
}

function key(state: string, constituency: string): string {
  return `${state.normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase()}\u0000${constituency.normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase()}`;
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
    proposed: [], ambiguousAreas: [], ambiguousMembers: [], unmatchedAreaIds: [], unmatchedMemberIds: [],
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
  return report;
}
