import assert from "node:assert/strict";
import test from "node:test";

import { summarizeAttendance, type AttendanceArchive } from "./attendance";

const record = (signed: number, notSigned: number, notRequired = 0) => ({ signed, presentUnsigned: 0, notSigned, notRequired, firstDay: "2026-01-28", lastDay: "2026-04-02" });
const archive: AttendanceArchive = {
  collectedAt: "2026-11-07T00:00:00.000Z",
  sessions: [
    { session: 1, days: 8, firstDay: "2024-06-24", lastDay: "2024-07-03", medianPercent: 87.5, members: { 10: record(8, 0), 20: record(0, 0, 8) } },
    { session: 2, days: 10, firstDay: "2024-07-22", lastDay: "2024-08-09", medianPercent: 90, members: { 10: record(5, 5), 20: record(2, 0, 8), 30: record(9, 1) } },
  ],
};

test("attendance counts only the days a member had to sign", () => {
  const member = summarizeAttendance(archive, 10)!;
  assert.deepEqual(member.sessions.map((session) => [session.session, session.signed, session.required, session.percent]), [[1, 8, 8, 100], [2, 5, 10, 50]]);
  assert.equal(member.percent, (13 / 18) * 100);
  assert.equal(member.exemptSessions, 0);

  const minister = summarizeAttendance(archive, 20)!;
  assert.equal(minister.sessions[0].percent, null, "no required days, so no share");
  assert.equal(minister.required, 2);
  assert.equal(minister.exemptSessions, 2);

  assert.deepEqual(summarizeAttendance(archive, 30)!.sessions.map((session) => session.session), [2], "a member who joined later has only later sessions");
  assert.equal(summarizeAttendance(archive, 99), null);
});
