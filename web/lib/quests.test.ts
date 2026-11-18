import assert from "node:assert/strict";
import test from "node:test";

import { complete, doneCount, isOfficialSource, parseProgress, QUESTS } from "./quests";

test("progress survives bad or foreign data in storage", () => {
  assert.deepEqual(parseProgress(null), {});
  assert.deepEqual(parseProgress("not json"), {});
  assert.deepEqual(parseProgress(JSON.stringify({ "read-a-result": { at: "2026-11-01T00:00:00.000Z" }, "hack": { at: "x" }, "trace-a-fact": { at: 5 } })), {
    "read-a-result": { at: "2026-11-01T00:00:00.000Z" },
  });
});

test("completing a quest keeps its first date and the latest detail", () => {
  const first = complete({}, "know-your-reps", "/share/reps/rajasthan/56-bagru", new Date("2026-11-01T00:00:00Z"));
  const again = complete(first, "know-your-reps", "/share/reps/rajasthan/54-malviya-nagar", new Date("2026-11-02T00:00:00Z"));
  assert.deepEqual(again["know-your-reps"], { at: "2026-11-01T00:00:00.000Z", detail: "/share/reps/rajasthan/54-malviya-nagar" });
  assert.equal(doneCount(again), 1);
  assert.equal(QUESTS.length, 5);
});

test("only official documents count as tracing a fact", () => {
  assert.equal(isOfficialSource("https://www.eci.gov.in/eci-backend/public/x.xlsx"), true);
  assert.equal(isOfficialSource("https://sansad.in/getFile/x.pdf"), true);
  assert.equal(isOfficialSource("https://election.rajasthan.gov.in/Form21E-27.pdf"), true);
  assert.equal(isOfficialSource("https://eci.gov.in.example.com/"), false);
  assert.equal(isOfficialSource("https://www.myneta.info/"), false);
  assert.equal(isOfficialSource("/seats"), false);
});
