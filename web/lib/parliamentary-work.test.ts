import assert from "node:assert/strict";
import test from "node:test";
import { getParliamentaryWork } from "./parliamentary-work";
import importedSession from "../records/imported/lok-sabha-18-session-7.json";

test("complete Session 7 question coverage is linked to the two reviewed MP identities", () => {
  assert.equal(importedSession.sourcePages.reduce((count, page) => count + page.count, 0), importedSession.totalSessionQuestions);
  assert.equal(importedSession.sourcePages.length, 7);
  assert.ok(importedSession.sourcePages.every((page) => /^[a-f0-9]{64}$/.test(page.sha256)));
  for (const [slug, count] of [["manju-sharma", 32], ["rao-rajendra-singh", 30]] as const) {
    const work = getParliamentaryWork(slug);
    assert.ok(work);
    assert.equal(work.session, 7);
    assert.equal(work.questions.length, count);
    assert.equal(new Set(work.questions.map((question) => question.id)).size, count);
    assert.ok(work.questions.every((question) => question.sourceUrl.startsWith("https://sansad.in/")));
  }
  assert.equal(getParliamentaryWork("jaipur-lok-sabha-2024-candidate-row-07"), null);
});
