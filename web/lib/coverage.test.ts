import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { getAreaCoverage } from "./publication";
import { ResultCoverage } from "../components/ResultCoverage";

test("Jaipur shows partial coverage of the imported election return", () => {
  const coverage = getAreaCoverage("jaipur-lok-sabha");
  assert.ok(coverage);
  assert.equal(coverage.state, "partial");
  assert.equal(coverage.publishedCandidateRows, 1);
  assert.equal(coverage.observedCandidateRows, 13);
  assert.match(coverage.lastAttemptedAt ?? "", /Z$/);
  assert.match(coverage.lastPublishedAt ?? "", /Z$/);
});

test("an area without a pipeline report does not inherit Jaipur coverage", () => {
  assert.equal(getAreaCoverage("jaipur-rural-lok-sabha"), null);
});

test("coverage card states the checked rows and avoids a false zero for an unassessed area", () => {
  const jaipur = renderToStaticMarkup(ResultCoverage({ areaId: "jaipur-lok-sabha" }));
  const rural = renderToStaticMarkup(ResultCoverage({ areaId: "jaipur-rural-lok-sabha" }));
  assert.match(jaipur, /1 of 13/);
  assert.match(jaipur, /Partial/);
  assert.match(rural, /not yet assessed/i);
  assert.doesNotMatch(rural, /0 of/);
});
