import assert from "node:assert/strict";
import test from "node:test";

import { findCandidate, findSeat, requireResults } from "./results";
import type { ProfileModel } from "./profile-model";
import { buildStory, storyBuilders } from "./story";

const base = (overrides: Partial<ProfileModel> = {}): ProfileModel => ({
  name: "Test Person", party: { name: "Indian National Congress", code: "INC", color: "#1c9ad6" },
  role: { label: "Won 2024", tone: "won" }, place: "Jaipur, Rajasthan", kicker: "Lok Sabha 2024 candidate",
  headline: "", breadcrumb: [], stats: [], timeline: [], facts: [], links: [], related: [], sources: [], coming: [],
  ...overrides,
});

const kinds = (model: ProfileModel) => buildStory(model).scenes.map((scene) => scene.kind);

test("a plain candidate gets who, the vote, the margin and sources", () => {
  const { seat, candidate } = findCandidate("lok-sabha-2024", "uttar-pradesh", "amethi", "smriti-irani")!;
  assert.deepEqual(kinds(base({ contest: { seat, candidate } })), ["person", "race", "big", "sources"]);
  const race = buildStory(base({ contest: { seat, candidate } })).scenes[1];
  assert.equal(race.kind === "race" && race.rows.find((row) => row.self)?.name, "Smriti Irani");
});

test("a full profile adds money, work and career scenes, and a real state comparison", () => {
  const { seat, candidate } = findCandidate("lok-sabha-2024", "rajasthan", "jaipur", "manju-sharma")!;
  const story = buildStory(base({
    contest: { seat, candidate },
    money: { election: "2024", assets: 23661843, liabilities: 4169859, cases: 0 },
    work: { questions: { total: 137, bySession: [], topMinistries: [{ name: "Railways", count: 10 }], latest: [], directoryUrl: "https://sansad.in", collectedOn: "" } },
    timeline: [
      { when: "4 Jun 2024 · Election", text: "Jaipur Lok Sabha, 2024", strong: true },
      { when: "2008 · Election", text: "Hawa Mahal Assembly election", strong: true },
      { when: "1983 · Education", text: "M.A., Rajasthan University" },
    ],
  }));
  assert.deepEqual(story.scenes.map((scene) => scene.kind), ["person", "race", "big", "money", "work", "timeline", "sources"]);
  const margin = story.scenes[2];
  assert.equal(margin.kind === "big" && margin.detail, "The 5th biggest margin of 25 seats in Rajasthan.");
  const career = story.scenes[5];
  assert.ok(career.kind === "timeline" && career.items.every((item) => !item.when.includes("2024")));
});

test("the closest result is named, and an unopposed seat has no vote scenes", () => {
  const rural = findCandidate("lok-sabha-2024", "rajasthan", "jaipur-rural", "rao-rajendra-singh")!;
  const margin = buildStory(base({ contest: { seat: rural.seat, candidate: rural.candidate } })).scenes[2];
  assert.equal(margin.kind === "big" && margin.detail, "The closest result of 25 seats in Rajasthan.");
  assert.deepEqual(kinds(base({ contest: { seat: findSeat("lok-sabha-2024", "gujarat", "surat")! } })), ["person", "sources"]);
});

test("every builder skips missing data instead of making empty scenes", () => {
  const empty = base();
  assert.deepEqual(kinds(empty), ["person", "sources"]);
  assert.equal(storyBuilders.length, 7);
  assert.ok(requireResults("lok-sabha-2024").seats.length > 0);
});
