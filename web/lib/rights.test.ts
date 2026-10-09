import assert from "node:assert/strict";
import { test } from "node:test";
import { currentDslsaHelpline, validateRightsGuide, type RightsGuide } from "./rights";

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
