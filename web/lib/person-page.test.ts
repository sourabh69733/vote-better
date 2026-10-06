import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import PersonPage from "../app/people/[slug]/page";

test("elected profile leads with office held before election and filing records", async () => {
  const page = await PersonPage({ params: Promise.resolve({ slug: "manju-sharma" }) });
  const html = renderToStaticMarkup(page);
  assert.match(html, /Offices held/);
  assert.ok(html.indexOf("Offices held") < html.indexOf("Election record"));
  assert.ok(html.indexOf("Offices held") < html.indexOf("Affidavit summary"));
  assert.match(html, /Member of Parliament, 18th Lok Sabha/);
  assert.match(html, /Elected\./);
  assert.doesNotMatch(html, /Current role evidence/);
});

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

test("elected profile moves from glance to work, public life and deeper records", async () => {
  const page = await PersonPage({ params: Promise.resolve({ slug: "manju-sharma" }) });
  const html = renderToStaticMarkup(page);
  for (const heading of ["At a glance", "Offices held", "Work and outcomes", "Public life", "Official presence", "Election and filing records", "Sources and review dates"]) {
    assert.match(html, new RegExp(heading));
  }
  assert.ok(html.indexOf("At a glance") < html.indexOf("Offices held"));
  assert.ok(html.indexOf("Offices held") < html.indexOf("Work and outcomes"));
  assert.ok(html.indexOf("Work and outcomes") < html.indexOf("Public life"));
  assert.ok(html.indexOf("Public life") < html.indexOf("Election and filing records"));
  assert.match(html, /Party at election/);
  assert.match(html, /Official profile/);
  assert.match(html, /Current term: 2024-06-04 to present/);
  assert.doesNotMatch(html, /Party changed/);
});

test("non-officeholder profile omits unsupported work, roles and presence", async () => {
  const page = await PersonPage({ params: Promise.resolve({ slug: "jaipur-lok-sabha-2024-candidate-row-01" }) });
  const html = renderToStaticMarkup(page);
  assert.match(html, /At a glance/);
  assert.match(html, /Public life/);
  assert.match(html, /Party at election/);
  assert.doesNotMatch(html, /Not elected in 2024/);
  assert.doesNotMatch(html, /Work and outcomes/);
  assert.doesNotMatch(html, /Offices held/);
  assert.doesNotMatch(html, /Official presence/);
});
