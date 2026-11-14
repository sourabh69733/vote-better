import assert from "node:assert/strict";
import test from "node:test";

import { buildAllMembersDebates } from "../src/sansad-debates-all.js";

const page = (records: unknown[]) => ({
  url: "https://sansad.in/api_ls/debate/debate-search?page=1",
  body: JSON.stringify({ _metadata: { currentPageNumber: 1, perPageSize: 100, totalElements: records.length, totalPages: 1 }, records }),
});
const debate = (dbSlno: number, mpCode: number, mpName: string) => ({
  loksabha: 18, session: 7, dbSlno, debateTitle: "Budget discussion", debateTypeDesc: "GENERAL DISCUSSION", debateDate: "10/03/2026",
  memberName: [mpName], mpPartDetailList: [{ mpName, mpCode, mpPartCode: 1 }],
});

test("every member's debates are collected, and a member whose records name someone else is reported", () => {
  const roster = [{ mpNo: 1, mpName: "Smt. Asha" }, { mpNo: 2, mpName: "Shri Bina" }, { mpNo: 3, mpName: "Shri Chand" }];
  const { archive, excluded } = buildAllMembersDebates([
    { member: roster[0], pages: [page([debate(10, 1, "Smt. Asha"), debate(11, 1, "Smt. Asha")])] },
    { member: roster[1], pages: [page([])] },
    { member: roster[2], pages: [page([debate(12, 3, "Shri Chand Kumar")])] },
  ], roster, "2026-11-07T00:00:00.000Z");
  assert.deepEqual(archive.members.map((member) => [member.memberId, member.totalRecords]), [[1, 2], [2, 0]]);
  assert.deepEqual(excluded.map((item) => item.mpNo), [3]);
  assert.match(excluded[0].reason, /identity mismatch/);
  const spaced = buildAllMembersDebates([{ member: { mpNo: 4, mpName: "Shri  Dev" }, pages: [page([debate(13, 4, "Shri Dev")])] }], [{ mpNo: 4, mpName: "Shri  Dev" }], "2026-11-07T00:00:00.000Z");
  assert.equal(spaced.archive.members[0].totalRecords, 1, "a double space in the roster name is not a different person");
});
