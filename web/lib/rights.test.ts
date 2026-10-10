import assert from "node:assert/strict";
import { test } from "node:test";
import { currentDslsaHelpline, rightsSituations, rightsSources, validateRightsGuide, validateRightsArticles, type RightsGuide } from "./rights";

test("public rights articles reject uncited paragraphs and unknown references", () => {
  const validate = validateRightsArticles;
  const references = { law: { label: "BNSS section 35", url: "https://www.mha.gov.in/law.pdf#page=13", locator: "Section 35; PDF page 13", checkedAt: "2026-10-10" } };
  const article = { id: "arrest", title: "Arrest", summary: "A summary", paragraphs: [{ text: "Explanation", references: ["law"] }] };
  assert.doesNotThrow(() => validate([article], references));
  assert.throws(() => validate([{ ...article, paragraphs: [{ text: "Explanation", references: [] }] }], references), /citation/i);
  assert.throws(() => validate([{ ...article, paragraphs: [{ text: "Explanation", references: ["missing"] }] }], references), /reference/i);
  assert.throws(() => validate([article, article], references), /duplicate/i);
  assert.throws(() => validate([article], { law: { ...references.law, locator: "" } }), /locator/i);
  assert.throws(() => validate([article], { law: { ...references.law, checkedAt: "invalid" } }), /date/i);
});

const guide: RightsGuide = {
  id: "arrested", situation: "Arrested", custodyPath: "ordinary", steps: [{ kind: "legal", text: "Ask for the grounds of arrest.", citationIds: ["bnss-47"] }],
  citations: [{ id: "bnss-47", url: "https://www.indiacode.nic.in/indiacode/handle/123456789/20099?view_type=browse", section: "BNSS section 47", checkedAt: "2026-10-09T00:00:00.000Z" }],
  lawEffectiveOn: "2024-07-01", sourceCheckedAt: "2026-10-09T00:00:00.000Z", legallyReviewedAt: "2026-10-09T01:00:00.000Z", reviewer: "Qualified legal reviewer", exceptions: ["preventive-detention"],
  helpContacts: [{ label: "DSLSA", url: "https://delhi.nalsa.gov.in/", checkedAt: "2026-10-09T00:00:00.000Z" }],
};

test("rights guide requires citations, legal review and current help contact", () => {
  assert.doesNotThrow(() => validateRightsGuide(guide, new Date("2026-10-09T12:00:00.000Z")));
  assert.throws(() => validateRightsGuide({ ...guide, steps: [{ ...guide.steps[0], citationIds: [] }] }, new Date("2026-10-09T12:00:00.000Z")), /citation/i);
  assert.throws(() => validateRightsGuide({ ...guide, legallyReviewedAt: undefined as never }, new Date("2026-10-09T12:00:00.000Z")), /review/i);
  assert.throws(() => validateRightsGuide(guide, new Date("2026-12-01T00:00:00.000Z")), /contact/i);
});

test("a 24-hour claim needs preventive-detention exception and amendment re-review", () => {
  const timed = { ...guide, steps: [{ kind: "legal" as const, text: "Produce before a magistrate within 24 hours.", citationIds: ["bnss-47"] }] };
  assert.throws(() => validateRightsGuide({ ...timed, exceptions: [] }, new Date("2026-10-09T12:00:00.000Z")), /preventive/i);
  assert.throws(() => validateRightsGuide({ ...guide, custodyPath: "mixed" as never }, new Date("2026-10-09T12:00:00.000Z")), /custody/i);
  assert.throws(() => validateRightsGuide({ ...guide, amendedAt: "2026-10-09T02:00:00.000Z" }, new Date("2026-10-09T12:00:00.000Z")), /amend/i);
});

test("a stored legal-aid phone is hidden after its check expires", () => {
  assert.equal(currentDslsaHelpline(new Date("2026-10-10T00:00:00.000Z")), "1516");
  assert.equal(currentDslsaHelpline(new Date("2026-12-01T00:00:00.000Z")), null);
});

test("every visible rights summary has official sources and a detention exception", () => {
  for (const situation of rightsSituations) {
    assert.ok(situation.summary.length > 50);
    assert.ok(situation.summaryReference);
    assert.ok(situation.sourceIds.length);
    for (const id of situation.sourceIds) assert.match(rightsSources[id].url, /^https:\/\//);
  }
  const detention = rightsSituations.find((item) => item.id === "detained");
  assert.match(detention?.summary ?? "", /24 hours/i);
  assert.match(detention?.summary ?? "", /preventive-detention/i);
});
