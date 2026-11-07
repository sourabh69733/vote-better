import assert from "node:assert/strict";
import test from "node:test";

import { buildAttendanceArchive, parseAttendance } from "../src/sansad-attendance.js";

const record = (marks: Record<string, string[]>) => JSON.stringify(
  ["S", "NR", "NS", "S*", "S#", "NS@"].map((type) => ({ attendanceType: type, dates: (marks[type] ?? []).map((day) => `${day} 00:00:00`) })));
const days = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => `2026-03-${String(from + index).padStart(2, "0")}`);

test("a register record counts signed, unsigned and not required days", () => {
  assert.deepEqual(parseAttendance(record({ S: days(1, 3), "S#": days(4, 4), "NS@": days(5, 5), NS: days(6, 7) })), {
    signed: 4, presentUnsigned: 1, notSigned: 2, notRequired: 0, firstDay: "2026-03-01", lastDay: "2026-03-07",
  });
  assert.equal(parseAttendance(record({})), null, "a record with no days means the person was not a member then");
  assert.throws(() => parseAttendance(JSON.stringify([{ attendanceType: "X", dates: [] }])), /unknown attendance mark X/);
  assert.throws(() => parseAttendance(record({ S: days(1, 1), NS: days(1, 1) })), /marked twice/);
});

test("a session's median leaves out members who did not have to sign every day", () => {
  const archive = buildAttendanceArchive([
    { session: 7, memberId: 1, record: parseAttendance(record({ S: days(1, 10) })) },
    { session: 7, memberId: 2, record: parseAttendance(record({ S: days(1, 5), NS: days(6, 10) })) },
    { session: 7, memberId: 3, record: parseAttendance(record({ NR: days(1, 10) })) },
    { session: 7, memberId: 4, record: parseAttendance(record({ S: days(1, 9) })) },
    { session: 7, memberId: 5, record: null },
  ], "2026-11-07T00:00:00.000Z");
  const [session] = archive.sessions;
  assert.equal(session.days, 10);
  assert.equal(session.medianPercent, 75, "members 1 and 2 only: member 3 need not sign and member 4's record lists 9 days");
  assert.deepEqual(session.differentDays, [4]);
  assert.deepEqual(Object.keys(session.members), ["1", "2", "3", "4"]);
});
