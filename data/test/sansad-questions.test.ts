import assert from "node:assert/strict";
import test from "node:test";
import { buildQuestionPublication, fetchText, normalizeQuestion, verifyCachedQuestionPublication } from "../src/sansad-questions.js";

const members = [
  { mpNo: 5619, mpName: "Smt. Manju Sharma" },
  { mpNo: 5632, mpName: "Shri Rao Rajendra Singh" },
];
const targets = [
  { personId: "manju-sharma", memberId: 5619, officialName: "Smt. Manju Sharma" },
  { personId: "rao-rajendra-singh", memberId: 5632, officialName: "Shri Rao Rajendra Singh" },
];
const question = {
  quesNo: 375, lokNo: "18", sessionNo: "7", type: "STARRED", date: "18.03.2026",
  subjects: "Renewable   Energy Schemes", ministry: "NEW AND RENEWABLE ENERGY",
  member: ["Smt. Manju Sharma", "Shri Rao Rajendra Singh"],
  questionsFilePath: "https://sansad.in/getFile/loksabhaquestions/annex/187/AS375_example.pdf?source=pqals",
};
const page = (rows: object[], total = rows.length) => ({ url: "https://sansad.in/api_ls/question/qetFilteredQuestionsAns?pageNo=1", body: JSON.stringify([{ listOfQuestions: rows, totalRecordSize: total }]) });

test("normalizes a sourced question without assigning sole authorship", () => {
  const normalized = normalizeQuestion(question, 18, 7);
  assert.equal(normalized.date, "2026-03-18");
  assert.equal(normalized.subject, "Renewable Energy Schemes");
  assert.equal(normalized.listedMembers.length, 2);
  assert.match(normalized.sourceUrl, /^https:\/\/sansad\.in\//);
});

test("one jointly listed question appears in both verified member profiles", () => {
  const publication = buildQuestionPublication([page([question])], members, 7, "2026-10-08T00:00:00.000Z", targets);
  assert.equal(publication.members[0].questions.length, 1);
  assert.equal(publication.members[1].questions.length, 1);
  assert.equal(publication.totalSessionQuestions, 1);
  assert.equal(publication.sourcePages.length, 1);
});

test("rejects incomplete pagination and changed member identity", () => {
  assert.throws(() => buildQuestionPublication([page([question], 2)], members, 7, "2026-10-08T00:00:00.000Z", targets), /Incomplete session/);
  assert.throws(() => buildQuestionPublication([page([question, question])], members, 7, "2026-10-08T00:00:00.000Z", targets), /Duplicate feed question/);
  assert.throws(() => buildQuestionPublication([page([question])], [{ mpNo: 5619, mpName: "Someone else" }, members[1]], 7, "2026-10-08T00:00:00.000Z", targets), /identity mismatch/);
  assert.throws(() => buildQuestionPublication([page([question])], [...members, { mpNo: 9999, mpName: "Smt. Manju Sharma" }], 7, "2026-10-08T00:00:00.000Z", targets), /ambiguous/);
});

test("records a complete session with no questions without treating it as missing", () => {
  const publication = buildQuestionPublication([page([], 0)], members, 1, "2026-10-08T00:00:00.000Z", targets);
  assert.equal(publication.totalSessionQuestions, 0);
  assert.equal(publication.members[0].questions.length, 0);
});

test("resume accepts only cached pages that recreate the saved publication", () => {
  const saved = buildQuestionPublication([page([question])], members, 7, "2026-10-08T00:00:00.000Z", targets);
  assert.equal(verifyCachedQuestionPublication(saved, [page([question])], members, targets), saved);
  assert.throws(() => verifyCachedQuestionPublication(saved, [page([{ ...question, subjects: "Changed subject" }])], members, targets), /Cached publication mismatch/);
});

test("retries a timed-out official page before abandoning a collection", async () => {
  let calls = 0;
  const request = (async () => {
    calls++;
    if (calls < 3) throw new Error("timeout");
    return new Response("official page");
  }) as typeof fetch;
  assert.equal(await fetchText("https://sansad.in/page", request, async () => {}), "official page");
  assert.equal(calls, 3);
});

test("accepts a newly reviewed member target without changing importer code", () => {
  const third = { personId: "new-member", memberId: 9999, officialName: "Shri New Member" };
  const newQuestion = { ...question, quesNo: 376, member: [third.officialName] };
  const publication = buildQuestionPublication([page([newQuestion])], [...members, { mpNo: 9999, mpName: third.officialName }], 7, "2026-10-08T00:00:00.000Z", [...targets, third]);
  assert.equal(publication.members[2].personId, third.personId);
  assert.equal(publication.members[2].questions.length, 1);
  assert.throws(() => buildQuestionPublication([page([question])], members, 7, "2026-10-08T00:00:00.000Z", [...targets, { ...targets[0], personId: "other" }]), /Duplicate member ID/);
});

test("rejects non-official question files", () => {
  assert.throws(() => normalizeQuestion({ ...question, questionsFilePath: "https://example.com/question.pdf" }, 18, 7), /official PDF/);
});
