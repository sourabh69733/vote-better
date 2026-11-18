import assert from "node:assert/strict";
import test from "node:test";
import { getParliamentaryWork, summarizeParliamentaryWork } from "./parliamentary-work";
import importedArchive from "../records/imported/lok-sabha-18-question-archive.json";

test("complete Session 7 question coverage is linked to the two reviewed MP identities", () => {
  const importedSession = importedArchive.sessions.find((session) => session.session === 7);
  assert.ok(importedSession);
  assert.equal(importedSession.sourcePages.reduce((count, page) => count + page.count, 0), importedSession.totalSessionQuestions);
  assert.equal(importedSession.sourcePages.length, 7);
  assert.ok(importedSession.sourcePages.every((page) => /^[a-f0-9]{64}$/.test(page.sha256)));
  for (const [slug, count] of [["manju-sharma", 32], ["rao-rajendra-singh", 30]] as const) {
    const work = getParliamentaryWork(slug);
    assert.ok(work);
    assert.equal(work.sessions.find((session) => session.session === 7)?.count, count);
    const sessionQuestions = work.questions.filter((question) => question.session === 7);
    assert.equal(sessionQuestions.length, count);
    assert.equal(new Set(sessionQuestions.map((question) => question.id)).size, count);
    assert.ok(sessionQuestions.every((question) => question.sourceUrl.startsWith("https://sansad.in/")));
  }
  assert.equal(getParliamentaryWork("jaipur-lok-sabha-2024-candidate-row-07"), null);
});

test("summarizes question activity by session without calling it an impact", () => {
  const makeQuestion = (id: string, date: string) => ({ id, date, number: 1, type: "UNSTARRED" as const, subject: "Roads", ministry: "ROAD TRANSPORT", listedMembers: ["Smt. Manju Sharma"], sourceUrl: "https://sansad.in/question.pdf" });
  const archive = { lokSabha: 18, sessions: [
    { session: 1, collectedAt: "2026-10-01T00:00:00Z", source: "https://sansad.in/ls/questions/questions-and-answers", sourcePages: [{ url: "https://sansad.in/api_ls/question/1", sha256: "a".repeat(64), count: 0 }], totalSessionQuestions: 0, members: [{ personId: "manju-sharma", questions: [] }] },
    { session: 2, collectedAt: "2026-10-02T00:00:00Z", source: "https://sansad.in/ls/questions/questions-and-answers", sourcePages: [{ url: "https://sansad.in/api_ls/question/2", sha256: "b".repeat(64), count: 1 }], totalSessionQuestions: 1, members: [{ personId: "manju-sharma", questions: [makeQuestion("q2", "2024-07-22")] }] },
    { session: 3, collectedAt: "2026-10-03T00:00:00Z", source: "https://sansad.in/ls/questions/questions-and-answers", sourcePages: [{ url: "https://sansad.in/api_ls/question/3", sha256: "c".repeat(64), count: 1 }], totalSessionQuestions: 1, members: [{ personId: "manju-sharma", questions: [makeQuestion("q3", "2024-12-02")] }] },
  ] };
  const work = summarizeParliamentaryWork(archive, "manju-sharma");
  assert.ok(work);
  assert.equal(work.questions.length, 2);
  assert.deepEqual(work.sessions.map(({ session, count }) => [session, count]), [[1, 0], [2, 1], [3, 1]]);
  assert.equal(work.questions[0].session, 3);
  assert.equal(work.collectedOn, "2026-10-03");
  assert.equal(work.sessions[1].sourcePages[0].sha256, "b".repeat(64));
  assert.equal(summarizeParliamentaryWork(archive, "unknown"), null);
});
