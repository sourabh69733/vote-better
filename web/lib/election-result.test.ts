import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ElectionResult } from "../components/ElectionResult";
import { getAreaElectionResult, getFactTrace, jaipurPublication } from "./publication";

test("Jaipur result contains every checked row, ordered by votes with fact trails", () => {
  const result = getAreaElectionResult("jaipur-lok-sabha");
  assert.ok(result);
  assert.equal(result.length, 13);
  assert.equal(result[0].name, "MANJU SHARMA");
  assert.equal(result[1].name, "PRATAP SINGH KHACHARIYAWAS");
  assert.equal(result.reduce((sum, row) => sum + row.votes, 0), 1452830);
  assert.ok(result.every((row, index) => index === 0 || result[index - 1].votes >= row.votes));
  assert.ok(result.every((row) => row.factIds.every((id) =>
    getFactTrace(jaipurPublication, id)?.source.locator.startsWith("page 1, candidate row "))));
});

test("an area without a reviewed result does not inherit Jaipur candidates", () => {
  assert.equal(getAreaElectionResult("jaipur-rural-lok-sabha"), null);
});

test("constituency result starts with the elected candidate and keeps other profiles one tap away", () => {
  const html = renderToStaticMarkup(ElectionResult({ areaId: "jaipur-lok-sabha" }));
  assert.match(html, /2024 election result/);
  assert.match(html, /MANJU SHARMA/);
  assert.doesNotMatch(html, /PRATAP SINGH KHACHARIYAWAS/);
  assert.doesNotMatch(html, /HARI NARAYAN MEENA/);
  assert.match(html, /View 12 other candidates/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /href="\/people\/manju-sharma"/);
  assert.doesNotMatch(html, /href="\/people\/jaipur-lok-sabha-2024-candidate-row-01"/);
  assert.equal((html.match(/href="\/facts\//g) ?? []).length, 1);
  assert.equal(renderToStaticMarkup(ElectionResult({ areaId: "jaipur-rural-lok-sabha" })), "");
});
