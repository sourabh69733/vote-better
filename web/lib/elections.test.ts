import assert from "node:assert/strict";
import test from "node:test";

import { electionStatus, formatDay, groupElections, lastCheckedOn, validateElections, type Election } from "./elections";
import { elections } from "@/records/elections";

const source = { title: "Press note", publisher: "ECI", url: "https://example.org/note", checkedOn: "2026-10-31" };
const base: Election = {
  id: "test-2026", body: "assembly", name: "Test", states: ["Test State"], seats: 10,
  announcedOn: "2026-03-15", polls: [{ date: "2026-04-09" }, { date: "2026-04-23" }], countingOn: "2026-05-04", sources: [source],
};

test("status follows the schedule day by day", () => {
  assert.equal(electionStatus(base, "2026-03-14"), "due");
  assert.equal(electionStatus(base, "2026-03-15"), "announced");
  assert.equal(electionStatus(base, "2026-04-09"), "polling");
  assert.equal(electionStatus(base, "2026-04-30"), "polling");
  assert.equal(electionStatus(base, "2026-05-04"), "counting");
  assert.equal(electionStatus(base, "2026-05-05"), "counted");
  assert.equal(electionStatus({ polls: [] }, "2026-10-31"), "due");
});

test("elections are grouped into now, upcoming and recent", () => {
  const due: Election = { ...base, id: "due-2027", announcedOn: undefined, polls: [], countingOn: undefined, termEndsOn: "2027-03" };
  const later: Election = { ...due, id: "later-2027", termEndsOn: "2027-12" };
  const old: Election = { ...base, id: "old-2025", announcedOn: "2025-01-07", polls: [{ date: "2025-02-05" }], countingOn: "2025-02-08" };
  const groups = groupElections([later, old, base, due], "2026-04-10");
  assert.deepEqual(groups.now.map((e) => e.id), ["test-2026"]);
  assert.deepEqual(groups.upcoming.map((e) => e.id), ["due-2027", "later-2027"]);
  assert.deepEqual(groups.recent.map((e) => e.id), ["old-2025"]);
  assert.deepEqual(groupElections([base, old], "2026-06-01").recent.map((e) => e.id), ["test-2026", "old-2025"]);
});

test("validation rejects impossible schedules and unsourced records", () => {
  assert.deepEqual(validateElections([base]), []);
  const bad = validateElections([
    { ...base, id: "Bad Id", countingOn: "2026-04-01", sources: [] },
    { ...base, polls: [{ date: "2026-04-23" }, { date: "2026-04-09" }] },
    { ...base, announcedOn: undefined },
    { ...base, id: "x", termEndsOn: "March 2027", sources: [{ ...source, url: "http://example.org" }] },
  ]);
  assert.ok(bad.some((e) => e.includes("lowercase")));
  assert.ok(bad.some((e) => e.includes("counting cannot precede")));
  assert.ok(bad.some((e) => e.includes("at least one source")));
  assert.ok(bad.some((e) => e.includes("duplicate id")));
  assert.ok(bad.some((e) => e.includes("ascending order")));
  assert.ok(bad.some((e) => e.includes("announcement date")));
  assert.ok(bad.some((e) => e.includes("termEndsOn")));
  assert.ok(bad.some((e) => e.includes("HTTPS")));
});

test("dates format for Indian readers, with month-only precision kept", () => {
  assert.equal(formatDay("2026-05-04"), "4 May 2026");
  assert.equal(formatDay("2027-03"), "March 2027");
});

test("the curated records are valid and cover the 2024 Lok Sabha election", () => {
  assert.deepEqual(validateElections(elections), []);
  const lokSabha = elections.find((e) => e.id === "lok-sabha-2024");
  assert.equal(lokSabha?.polls.length, 7);
  assert.equal(lokSabha?.siteHref, "/seats");
  assert.equal(lastCheckedOn(elections), "2026-10-31");
  const groups = groupElections(elections, "2026-10-31");
  assert.equal(groups.now.length, 0);
  assert.equal(groups.upcoming.length, 7);
  assert.equal(groups.recent[0].id, "bye-elections-october-2026");
});
