import assert from "node:assert/strict";
import test from "node:test";
import { buildQuestionPublication, normalizeQuestion } from "../src/sansad-questions.js";

const members = [
  { mpNo: 5619, mpName: "Smt. Manju Sharma" },
  { mpNo: 5632, mpName: "Shri Rao Rajendra Singh" },
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
  const publication = buildQuestionPublication([page([question])], members, 7, "2026-10-08T00:00:00.000Z");
  assert.equal(publication.members[0].questions.length, 1);
  assert.equal(publication.members[1].questions.length, 1);
  assert.equal(publication.totalSessionQuestions, 1);
  assert.equal(publication.sourcePages.length, 1);
});

test("rejects incomplete pagination and changed member identity", () => {
  assert.throws(() => buildQuestionPublication([page([question], 2)], members, 7, "2026-10-08T00:00:00.000Z"), /Incomplete session/);
  assert.throws(() => buildQuestionPublication([page([question, question])], members, 7, "2026-10-08T00:00:00.000Z"), /Duplicate feed question/);
  assert.throws(() => buildQuestionPublication([page([question])], [{ mpNo: 5619, mpName: "Someone else" }, members[1]], 7, "2026-10-08T00:00:00.000Z"), /identity mismatch/);
  assert.throws(() => buildQuestionPublication([page([question])], [...members, { mpNo: 9999, mpName: "Smt. Manju Sharma" }], 7, "2026-10-08T00:00:00.000Z"), /ambiguous/);
});

test("rejects non-official question files", () => {
  assert.throws(() => normalizeQuestion({ ...question, questionsFilePath: "https://example.com/question.pdf" }, 18, 7), /official PDF/);
});
