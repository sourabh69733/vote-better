import assert from "node:assert/strict";
import test from "node:test";

test("published records have one sourced term per current area holder", async () => {
  const { dataset, validateCivicDataset } = await import("@/records/registry");
  assert.deepEqual(validateCivicDataset(dataset), []);
  assert.equal(dataset.terms.length, 2);
  assert.deepEqual(dataset.terms.map((term) => term.personId), ["manju-sharma", "rao-rajendra-singh"]);
  assert.ok(dataset.terms.every((term) => term.areaSourceIds.length && term.holderSourceIds.length));
});

test("a broken source reference blocks publication", async () => {
  const { dataset, validateCivicDataset } = await import("@/records/registry");
  const broken = {
    ...dataset,
    terms: [{ ...dataset.terms[0], holderSourceIds: ["missing-source"] }, ...dataset.terms.slice(1)],
  };
  assert.ok(validateCivicDataset(broken).some((error) => error.includes("missing-source")));
});

test("a second current holder for the same seat blocks publication", async () => {
  const { dataset, validateCivicDataset } = await import("@/records/registry");
  const duplicate = {
    ...dataset,
    terms: [...dataset.terms, { ...dataset.terms[0], id: "duplicate-current-term" }],
  };
  assert.ok(validateCivicDataset(duplicate).some((error) => error.includes("Multiple current holders")));
});
