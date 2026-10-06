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

test("constituency result shows leading rows first and makes all 13 accessible", () => {
  const html = renderToStaticMarkup(ElectionResult({ areaId: "jaipur-lok-sabha" }));
  assert.match(html, /2024 election result/);
  assert.match(html, /MANJU SHARMA/);
  assert.match(html, /PRATAP SINGH KHACHARIYAWAS/);
  assert.match(html, /HARI NARAYAN MEENA/);
  assert.match(html, /Show all 13 candidates/);
  assert.equal((html.match(/href="\/facts\//g) ?? []).length, 13);
  assert.equal(renderToStaticMarkup(ElectionResult({ areaId: "jaipur-rural-lok-sabha" })), "");
});
