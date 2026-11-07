import assert from "node:assert/strict";
import { test } from "node:test";
import { delhiSources, validateDelhiSourceCatalog } from "../src/delhi/source-catalog.js";

test("audited sources have unique IDs and bounded collection scope", () => {
  assert.doesNotThrow(() => validateDelhiSourceCatalog(delhiSources));
  assert.throws(() => validateDelhiSourceCatalog([...delhiSources, delhiSources[0]]), /duplicate/i);
  assert.throws(() => validateDelhiSourceCatalog([{ ...delhiSources[0], scope: "" }]), /scope/i);
  assert.throws(() => validateDelhiSourceCatalog([{ ...delhiSources[0], reuseStatus: undefined as never }]), /reuse/i);
  assert.throws(() => validateDelhiSourceCatalog([{ ...delhiSources[0], allowedPredicates: ["private.phone" as never] }]), /predicate/i);
});
