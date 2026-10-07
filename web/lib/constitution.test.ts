import assert from "node:assert/strict";
import test from "node:test";
import { searchQuestions } from "./constitution";
import { constitutionQuestions, constitutionTopics } from "../records/constitution";

test("everyday questions find the right answer first", () => {
  const cases: [string, string][] = [
    ["what age can i vote", "voting-age"],
    ["police arrested my brother", "arrest"],
    ["who fixes the drains in my ward", "panchayat"],
    ["can I criticise the PM", "speech"],
    ["article 21A", "education"],
    ["difference between MP and MLA", "mp-mla"],
  ];
  for (const [query, id] of cases) {
    assert.equal(searchQuestions(constitutionQuestions, query)[0]?.id, id, query);
  }
});

test("unrelated or empty queries return nothing", () => {
  assert.deepEqual(searchQuestions(constitutionQuestions, ""), []);
  assert.deepEqual(searchQuestions(constitutionQuestions, "the of a"), []);
  assert.deepEqual(searchQuestions(constitutionQuestions, "cricket score"), []);
});

test("every answer cites an article and belongs to a topic", () => {
  const topicIds = new Set(constitutionTopics.map((topic) => topic.id));
  const ids = new Set<string>();
  for (const item of constitutionQuestions) {
    assert.ok(/Article|Schedule/.test(item.articles), item.id);
    assert.ok(topicIds.has(item.topicId), item.id);
    assert.ok(!ids.has(item.id), `duplicate ${item.id}`);
    ids.add(item.id);
  }
  for (const topic of constitutionTopics) {
    assert.ok(topic.points.every((point) => /Article|Schedule/.test(point.articles)), topic.id);
  }
});

test("protest questions lead to the protest guide", async () => {
  const { getConstitutionGuide } = await import("../records/constitution-guides");
  for (const query of ["what are my protest rights", "can police stop our dharna", "can we block the road"]) {
    const best = searchQuestions(constitutionQuestions, query)[0];
    assert.equal(best?.guideId, "protest", query);
  }
  const guide = getConstitutionGuide("protest");
  assert.ok(guide);
  assert.ok(guide.sections.every((section) => section.items.every((item) => item.ref.length > 0)));
});
