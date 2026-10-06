import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import PersonPage from "../app/people/[slug]/page";

test("a Jaipur candidate profile shows party, result, affidavit summary and source", async () => {
  const page = await PersonPage({ params: Promise.resolve({ slug: "jaipur-lok-sabha-2024-candidate-row-01" }) });
  const html = renderToStaticMarkup(page);
  assert.match(html, /Pratap Singh Khachariyawas/);
  assert.match(html, /Indian National Congress/);
  assert.match(html, /5,55,083/);
  assert.match(html, /Age at filing/);
  assert.match(html, /Post Graduate/);
  assert.match(html, /2024 self-declared affidavit/);
  assert.match(html, /candidate_id=419/);
  assert.match(html, /href="\/areas\/jaipur-lok-sabha"/);
});

test("a candidate with only an official filing age leaves other disclosure fields empty", async () => {
  const page = await PersonPage({ params: Promise.resolve({ slug: "jaipur-lok-sabha-2024-candidate-row-07" }) });
  const html = renderToStaticMarkup(page);
  assert.match(html, /Pradeep Verma/);
  assert.match(html, /Age at filing/);
  assert.doesNotMatch(html, /Education declared/);
  assert.doesNotMatch(html, /Assets declared/);
});
