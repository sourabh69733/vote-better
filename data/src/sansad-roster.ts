import type { SansadMember } from "./mp-crosswalk.js";

export interface SansadClaimRow {
  snapshotId: string;
  url: string;
  contentHash: string;
  capturedAt: string;
  locator: string;
  predicate: string;
  value: unknown;
}

export interface RosterSnapshot {
  id: string;
  page: number;
  url: string;
  contentHash: string;
  capturedAt: string;
}

const requiredPredicates = ["person.sansadMemberId", "person.name", "office.party", "office.state",
  "office.constituency", "office.membershipStatus"] as const;

function sourcePage(urlText: string): { page: number; size: number } {
  const url = new URL(urlText);
  if (url.origin !== "https://sansad.in" || url.pathname !== "/api_ls/member" ||
      url.searchParams.get("loksabha") !== "18" || url.searchParams.get("sitting") !== "1" ||
      url.searchParams.get("memberStatus") !== "s") throw new Error("unexpected Sansad source URL");
  const page = Number(url.searchParams.get("page"));
  const size = Number(url.searchParams.get("size"));
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(size) || size < 1 || size > 100) {
    throw new Error("invalid Sansad page or size");
  }
  return { page, size };
}

export function assembleSansadRoster(rows: readonly SansadClaimRow[]): { members: SansadMember[]; snapshots: RosterSnapshot[] } {
  if (!rows.length) throw new Error("no Sansad member claims found");
  const snapshots = new Map<number, RosterSnapshot>();
  const pageMembers = new Map<number, Set<number>>();
  const claims = new Map<number, Map<string, string>>();
  const memberSnapshots = new Map<number, string>();
  let pageSize: number | undefined;

  for (const row of rows) {
    const { page, size } = sourcePage(row.url);
    if (pageSize !== undefined && size !== pageSize) throw new Error("mixed Sansad page sizes");
    pageSize = size;
    const previous = snapshots.get(page);
    if (previous && (previous.id !== row.snapshotId || previous.url !== row.url ||
        previous.contentHash !== row.contentHash || previous.capturedAt !== row.capturedAt)) {
      throw new Error(`multiple snapshots for Sansad page ${page}; select one complete import`);
    }
    snapshots.set(page, { id: row.snapshotId, page, url: row.url,
      contentHash: row.contentHash, capturedAt: row.capturedAt });

    const locator = /^membersDtoList\[mpsno=(\d+)\]\.[A-Za-z]+$/.exec(row.locator);
    const id = locator ? Number(locator[1]) : NaN;
    if (!Number.isSafeInteger(id) || id < 1 || typeof row.value !== "string" || !row.value.trim() ||
        !requiredPredicates.includes(row.predicate as typeof requiredPredicates[number])) {
      throw new Error(`invalid Sansad claim at ${row.locator}`);
    }
    if (row.predicate === "person.sansadMemberId" && row.value !== String(id)) {
      throw new Error(`member ID conflicts with locator ${row.locator}`);
    }
    if (memberSnapshots.has(id) && memberSnapshots.get(id) !== row.snapshotId) {
      throw new Error(`repeated member ${id} across snapshots`);
    }
    memberSnapshots.set(id, row.snapshotId);
    pageMembers.set(page, (pageMembers.get(page) ?? new Set()).add(id));
    const fields = claims.get(id) ?? new Map<string, string>();
    if (fields.has(row.predicate)) throw new Error(`repeated ${row.predicate} for member ${id}`);
    fields.set(row.predicate, row.value.trim());
    claims.set(id, fields);
  }

  const sortedSnapshots = [...snapshots.values()].sort((a, b) => a.page - b.page);
  const lastPage = sortedSnapshots.at(-1)!.page;
  for (let page = 1; page <= lastPage; page += 1) {
    const count = pageMembers.get(page)?.size;
    if (!snapshots.has(page) || !count || (page < lastPage && count !== pageSize) || count > pageSize!) {
      throw new Error(`incomplete page ${page} in Sansad roster`);
    }
  }

  const members: SansadMember[] = [...claims.entries()].sort(([a], [b]) => a - b).map(([id, fields]) => {
    for (const predicate of requiredPredicates) {
      if (!fields.has(predicate)) throw new Error(`missing ${predicate} for member ${id}`);
    }
    return { id, name: fields.get("person.name")!, party: fields.get("office.party")!,
      state: fields.get("office.state")!, constituency: fields.get("office.constituency")!,
      status: fields.get("office.membershipStatus")!, snapshotId: memberSnapshots.get(id)! };
  });
  return { members, snapshots: sortedSnapshots };
}
