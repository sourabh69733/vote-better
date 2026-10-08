import assert from "node:assert/strict";
import test from "node:test";
import { buildDebatePublication, normalizeDebate } from "../src/sansad-debates.js";

const target = { personId: "manju-sharma", memberId: 5619, officialName: "Smt. Manju Sharma" };
const other = { personId: "rao-rajendra-singh", memberId: 5632, officialName: "Shri Rao Rajendra Singh" };
const roster = [{ mpNo: 5619, mpName: target.officialName }, { mpNo: 5632, mpName: other.officialName }];
const row = { loksabha: 18, session: 8, dbSlno: 6988, debateTitle: "Jaipur EV Hub.-laid", debateDate: "24/07/2026",
  debateTypeDesc: "MATTERS UNDER RULE-377", memberName: [target.officialName], mpPartDetailList: [{ mpName: target.officialName, mpCode: 5619, mpPartCode: 1 }] };
const page = (records: object[], total = records.length, number = 1) => ({
  url: `https://sansad.in/api_ls/debate/debate-search?page=${number}`,
  body: JSON.stringify({ _metadata: { currentPageNumber: number, perPageSize: 100, totalElements: total, totalPages: Math.ceil(total / 100) }, records }),
});

test("normalizes a debate listing the exact official member ID and links its official view", () => {
  const debate = normalizeDebate(row, target);
  assert.equal(debate.date, "2026-07-24");
  assert.equal(debate.category, "MATTERS UNDER RULE-377");
  assert.equal(debate.sourceUrl, "https://sansad.in/ls/debates/view-debate?ls=18&session=8&dbslno=6988");
  assert.throws(() => normalizeDebate({ ...row, mpPartDetailList: [{ mpName: target.officialName, mpCode: 123 }] }, target), /Member identity mismatch/);
});

test("publishes only complete member-filtered pages and rejects duplicate debates", () => {
  const publication = buildDebatePublication([
    { target, pages: [page([row])] },
    { target: other, pages: [page([])] },
  ], roster, "2026-10-08T00:00:00Z");
  assert.equal(publication.members[0].records.length, 1);
  assert.equal(publication.members[1].records.length, 0);
  assert.equal(publication.members[0].totalRecords, 1);
  assert.equal(publication.members[0].sourcePages[0].count, 1);
  assert.throws(() => buildDebatePublication([{ target, pages: [page([row], 2)] }], roster, "2026-10-08T00:00:00Z"), /Incomplete debate feed/);
  assert.throws(() => buildDebatePublication([{ target, pages: [page([row, row])] }], roster, "2026-10-08T00:00:00Z"), /Duplicate debate/);
});
