import assert from "node:assert/strict";
import test from "node:test";
import { buildQuestionArchive } from "../src/sansad-question-archive.js";
import type { QuestionPublication } from "../src/sansad-questions.js";

function session(number: number): QuestionPublication {
  return {
    lokSabha: 18, session: number, collectedAt: "2026-10-08T00:00:00.000Z",
    source: "https://sansad.in/ls/questions/questions-and-answers",
    sourcePages: [{ url: `https://sansad.in/api_ls/question/session/${number}`, sha256: "a".repeat(64), count: 1 }],
    totalSessionQuestions: 1,
    members: [{ personId: "manju-sharma", memberId: 5619, officialName: "Smt. Manju Sharma", questions: [{
      id: `ls18-s${number}-unstarred-1-2026-01-01`, date: "2026-01-01", number: 1,
      type: "UNSTARRED", subject: "Roads", ministry: "ROAD TRANSPORT",
      listedMembers: ["Smt. Manju Sharma"], sourceUrl: "https://sansad.in/question.pdf",
    }] }],
  };
}

test("combines complete sessions in order with their separate capture dates", () => {
  const archive = buildQuestionArchive([session(2), session(1)], [1, 2]);
  assert.deepEqual(archive.sessions.map((item) => item.session), [1, 2]);
  assert.equal(archive.sessions[0].members[0].questions[0].id, "ls18-s1-unstarred-1-2026-01-01");
});

test("refuses an archive with a missing session or changed member identity", () => {
  assert.throws(() => buildQuestionArchive([session(1)], [1, 2]), /Missing session 2/);
  assert.throws(() => buildQuestionArchive([session(1), session(1)], [1]), /Duplicate session 1/);
  const changed = session(2);
  changed.members[0].memberId = 7777;
  assert.throws(() => buildQuestionArchive([session(1), changed], [1, 2]), /Member identity changed/);
  const incomplete = session(2);
  incomplete.totalSessionQuestions = 2;
  assert.throws(() => buildQuestionArchive([session(1), incomplete], [1, 2]), /Incomplete session 2/);
});
