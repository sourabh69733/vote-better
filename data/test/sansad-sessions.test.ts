import assert from "node:assert/strict";
import test from "node:test";

import { parseSessionDates, planSessions } from "../src/sansad-sessions.js";

const body = JSON.stringify([
  { loksabha: 17, sessions: [{ sessionNo: 15, sessionPeriod: ["31/01/2024 to 10/02/2024"], dates: [] }] },
  { loksabha: 18, sessions: [
    { sessionNo: 8, sessionPeriod: ["20/07/2026 to 13/08/2026"], dates: [] },
    { sessionNo: 7, sessionPeriod: ["28/01/2026 to 02/04/2026", "16/04/2026 to 18/04/2026"], dates: [] },
    { sessionNo: 9, sessionPeriod: ["30/11/2026 to 19/12/2026"], dates: [] },
  ] },
]);

test("sessions are read from their periods, including a session that sat twice", () => {
  assert.deepEqual(parseSessionDates(body), [
    { session: 7, firstDay: "2026-01-28", lastDay: "2026-04-18" },
    { session: 8, firstDay: "2026-07-20", lastDay: "2026-08-13" },
    { session: 9, firstDay: "2026-11-30", lastDay: "2026-12-19" },
  ]);
});

test("only sessions that have begun are collected, and a recent one is fetched again", () => {
  const windows = parseSessionDates(body);
  assert.deepEqual(planSessions(windows, "2026-11-15"), { held: [7, 8], refresh: [] }, "session 8 ended more than 30 days ago");
  assert.deepEqual(planSessions(windows, "2026-08-25"), { held: [7, 8], refresh: [8] }, "session 8 ended 12 days ago");
  assert.deepEqual(planSessions(windows, "2026-12-05"), { held: [7, 8, 9], refresh: [9] }, "session 9 is sitting");
});
