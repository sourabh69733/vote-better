import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import FactPage from "../app/facts/[factId]/page";
import { jaipurPublication } from "./publication";

test("a Jaipur candidate fact returns to that candidate's profile", async () => {
  const fact = jaipurPublication.facts.find((item) => item.subjectId !== "manju-sharma");
  assert.ok(fact);
  const page = await FactPage({ params: Promise.resolve({ factId: fact.id }) });
  const html = renderToStaticMarkup(page);
  assert.match(html, new RegExp(`href="/people/${fact.subjectId}"`));
});
