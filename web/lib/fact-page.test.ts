import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import FactPage from "../app/facts/[factId]/page";
import { jaipurPublication } from "./publication";

test("a candidate without a profile returns to the constituency from a fact trail", async () => {
  const fact = jaipurPublication.facts.find((item) => item.subjectId !== "manju-sharma");
  assert.ok(fact);
  const page = await FactPage({ params: Promise.resolve({ factId: fact.id }) });
  const html = renderToStaticMarkup(page);
  assert.match(html, /href="\/areas\/jaipur-lok-sabha"/);
  assert.doesNotMatch(html, /href="\/people\/jaipur-lok-sabha-2024-candidate-row-/);
});
