import assert from "node:assert/strict";
import test from "node:test";
import { validateCivicDataset, type CivicDataset } from "./civic-records";

const empty: CivicDataset = {
  areas: [], offices: [], people: [], terms: [], candidacies: [], activities: [], disclosures: [], backgrounds: [], careerEvents: [], sources: [],
};

test("an empty dataset has no broken references", () => {
  assert.deepEqual(validateCivicDataset(empty), []);
});

test("a term with missing person, area, office, and evidence is rejected", () => {
  const errors = validateCivicDataset({
    ...empty,
    terms: [{
      id: "term-1", personId: "missing-person", areaId: "missing-area", officeId: "missing-office",
      title: "Example term", party: "Example party", startedOn: "2024-06-04", reviewedOn: "2026-10-03",
      areaSourceIds: ["missing-source"], holderSourceIds: ["missing-source"],
      statusSourceId: "missing-source", biographySourceId: "missing-source",
    }],
  });
  assert.ok(errors.some((error) => error.includes("missing-person")));
  assert.ok(errors.some((error) => error.includes("missing-area")));
  assert.ok(errors.some((error) => error.includes("missing-office")));
  assert.ok(errors.some((error) => error.includes("missing-source")));
});

test("background and career claims require a known person and source", () => {
  const errors = validateCivicDataset({
    ...empty,
    backgrounds: [{ id: "background-1", personId: "missing-person", educationDetail: "Example", context: "Filing", sourceId: "missing-source" }],
    careerEvents: [{ id: "career-1", personId: "missing-person", title: "Example role", period: "2018", sortOn: "2018-01-01", sourceId: "missing-source" }],
  });
  assert.ok(errors.some((error) => error.includes("background-1") && error.includes("missing-person")));
  assert.ok(errors.some((error) => error.includes("background-1") && error.includes("missing-source")));
  assert.ok(errors.some((error) => error.includes("career-1") && error.includes("missing-person")));
  assert.ok(errors.some((error) => error.includes("career-1") && error.includes("missing-source")));
});
