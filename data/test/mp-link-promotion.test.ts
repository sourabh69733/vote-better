import assert from "node:assert/strict";
import test from "node:test";

import { prepareMpLinkQueue, promoteMpLinks, type MpLinkDecision } from "../src/mp-link-promotion.js";

const report = {
  schemaVersion: 1,
  reviewStatus: "unreviewed",
  boundarySource: { inputSha256: "sha256:boundary" },
  rosterSnapshots: [{ id: "snapshot-1", contentHash: "sha256:roster" }],
  areas: {
    "806": { label: "JAIPUR RURAL", state: "RAJASTHAN" },
    "807": { label: "JAIPUR", state: "RAJASTHAN" },
  },
  members: [
    { id: 5619, name: "Manju Sharma", party: "BJP", constituency: "Jaipur", state: "Rajasthan", status: "Sitting", snapshotId: "snapshot-1" },
    { id: 5632, name: "Rao Rajendra Singh", party: "BJP", constituency: "Jaipur Rural", state: "Rajasthan", status: "Sitting", snapshotId: "snapshot-1" },
  ],
  proposed: [{ areaId: "807", memberId: 5619 }],
  suggested: [{ areaId: "806", memberId: 5632, reason: "seat-suffix" }],
};
const directory = [{ mpNo: 5619, mpName: "Smt. Manju Sharma" }, { mpNo: 5632, mpName: "Shri Rao Rajendra Singh" }];
const existing = [{ personId: "manju-sharma", memberId: 5619, officialName: "Smt. Manju Sharma" }];

function decision(queue: ReturnType<typeof prepareMpLinkQueue>, index: number, personId: string): MpLinkDecision {
  const row = queue.matches[index];
  return { decision: "approve", areaId: row.areaId, memberId: row.memberId, personId,
    reviewToken: row.reviewToken, reviewer: "local-reviewer", reviewedAt: "2026-10-09T10:00:00.000Z",
    reason: "Checked the member ID and both constituency labels against source records" };
}

test("prepares source-bound exact matches and suggestions without approving either", () => {
  const queue = prepareMpLinkQueue(report, directory, "sha256:question-directory");
  assert.equal(queue.matches.length, 2);
  assert.deepEqual(queue.matches.map(({ memberId, matchKind, officialName }) => ({ memberId, matchKind, officialName })), [
    { memberId: 5632, matchKind: "suggested", officialName: "Shri Rao Rajendra Singh" },
    { memberId: 5619, matchKind: "exact", officialName: "Smt. Manju Sharma" },
  ]);
  assert.match(queue.matches[0].reviewToken, /^[a-f0-9]{64}$/);
  assert.equal(queue.boundarySource.inputSha256, "sha256:boundary");
  assert.equal(queue.rosterSnapshots[0].contentHash, "sha256:roster");
  assert.equal(queue.matches[0].rosterSnapshotId, "snapshot-1");
});

test("only explicit approved decisions promote targets while preserving existing IDs", () => {
  const queue = prepareMpLinkQueue(report, directory, "sha256:question-directory");
  assert.deepEqual(promoteMpLinks(queue, queue, [], existing), existing);
  assert.deepEqual(promoteMpLinks(queue, queue, [{ decision: "pending", areaId: queue.matches[0].areaId,
    memberId: queue.matches[0].memberId, reviewToken: queue.matches[0].reviewToken }], existing), existing);
  assert.deepEqual(promoteMpLinks(queue, queue, [{ ...decision(queue, 0, "rao-rajendra-singh"), decision: "reject" }], existing), existing);
  const result = promoteMpLinks(queue, queue, [decision(queue, 1, "manju-sharma"), decision(queue, 0, "rao-rajendra-singh")], existing);
  assert.deepEqual(result, [...existing, { personId: "rao-rajendra-singh", memberId: 5632, officialName: "Shri Rao Rajendra Singh" }]);
});

test("rejects a decision after source data or official name changes", () => {
  const queue = prepareMpLinkQueue(report, directory, "sha256:question-directory");
  const changed = prepareMpLinkQueue({ ...report, areas: { ...report.areas, "806": { label: "OTHER", state: "RAJASTHAN" } } }, directory, "sha256:question-directory");
  assert.throws(() => promoteMpLinks(queue, changed, [decision(queue, 0, "rao-rajendra-singh")], existing), /stale/);
  const renamed = prepareMpLinkQueue(report, [{ ...directory[0] }, { mpNo: 5632, mpName: "Shri Other Name" }], "sha256:new-directory");
  assert.throws(() => promoteMpLinks(queue, renamed, [decision(queue, 0, "rao-rajendra-singh")], existing), /stale/);
  const edited = { ...queue, matches: [{ ...queue.matches[0], officialName: "Shri False Name" }, queue.matches[1]] };
  assert.throws(() => promoteMpLinks(edited, queue, [decision(queue, 0, "rao-rajendra-singh")], existing), /stale/);
});

test("rejects duplicate decisions, duplicate person IDs and conflicting existing targets", () => {
  const queue = prepareMpLinkQueue(report, directory, "sha256:question-directory");
  const approved = decision(queue, 0, "rao-rajendra-singh");
  assert.throws(() => promoteMpLinks(queue, queue, [approved, approved], existing), /duplicate decision/);
  assert.throws(() => promoteMpLinks(queue, queue, [decision(queue, 0, "manju-sharma")], existing), /person ID/);
  assert.throws(() => promoteMpLinks(queue, queue, [decision(queue, 1, "wrong-person")], existing), /conflicts with existing/);
});

test("rejects an approval without audit details or a valid source directory", () => {
  const queue = prepareMpLinkQueue(report, directory, "sha256:question-directory");
  assert.throws(() => promoteMpLinks(queue, queue, [{ ...decision(queue, 0, "rao-rajendra-singh"), reason: "" }], existing), /review/);
  assert.throws(() => prepareMpLinkQueue(report, [...directory, directory[0]], "sha256:question-directory"), /directory/);
});
