import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import PersonPage from "../app/people/[slug]/page";
import { listPersonSlugs } from "./verified-profile";

const render = async (slug: string) => renderToStaticMarkup(await PersonPage({ params: Promise.resolve({ slug }) }));
const sections = (html: string) => [...html.matchAll(/<section id="([a-z]+)"/g)].map((match) => match[1]);

test("sitting MP profile leads with office, result and filled key facts", async () => {
  const html = await render("manju-sharma");
  assert.match(html, /Sitting MP/);
  assert.match(html, /Sitting MP for Jaipur, Rajasthan, 2 years, 3 months into the term/);
  assert.match(html, /Won by/);
  assert.match(html, /3\.32 lakh/);
  assert.match(html, /₹2\.37 crore/);
  assert.match(html, /Declared criminal cases/);
  assert.deepEqual(sections(html), ["contest", "work", "money", "story", "sources"]);
  assert.match(html, /Current party · checked 2 Oct 2026/);
  assert.match(html, /Member of Parliament, 18th Lok Sabha/);
  assert.match(html, /4 Jun 2024 to present/);
  assert.equal((html.match(/>Current office</g) ?? []).length, 1);
  assert.match(html, /Official profile/);
});

test("sitting MP work and story keep sourced history without inventing outcomes", async () => {
  const html = await render("manju-sharma");
  assert.match(html, /1983 · Education/);
  assert.match(html, /M\.A\., Rajasthan University/);
  assert.match(html, /LL\.B\. \(academic\)/);
  assert.match(html, /Hawa Mahal Assembly election/);
  assert.match(html, /jewellery business/i);
  assert.match(html, /not a continuous employment history/);
  assert.doesNotMatch(html, /Candidate-published account/);
  assert.doesNotMatch(html, /Navsari district/);
  assert.match(html, /It does not show that a project was delivered/);
  assert.match(html, /Questions asked/);
  assert.match(html, />137</);
  assert.match(html, /Session 8/);
  assert.match(html, /Agriculture and Farmers Welfare/);
  assert.match(html, />48</);
  assert.match(html, /Not today&#x27;s wealth/);
});

test("former candidate shows election-time party, earlier roles and affidavit, but no office work", async () => {
  const html = await render("jaipur-lok-sabha-2024-candidate-row-01");
  assert.match(html, /Pratap Singh Khachariyawas/);
  assert.match(html, /Lost · 2 of 13/);
  assert.match(html, /Party at 2024 election/);
  assert.doesNotMatch(html, /Current party · checked/);
  assert.match(html, /5,55,083/);
  assert.match(html, /Rajasthan University, 1992/);
  assert.match(html, /Elected MLA, Civil Lines/);
  assert.match(html, /Transport Minister, Rajasthan/);
  assert.match(html, /Assets/);
  assert.match(html, /candidate_id=419/);
  assert.match(html, /href="\/seats\/rajasthan\/jaipur"/);
  assert.ok(!sections(html).includes("work"));
  assert.doesNotMatch(html, /Official profile/);
});

test("a candidate with only an official filing age shows no empty money boxes", async () => {
  const html = await render("jaipur-lok-sabha-2024-candidate-row-07");
  assert.match(html, /Pradeep Verma/);
  assert.match(html, /Age at filing/);
  assert.doesNotMatch(html, /Education declared/);
  assert.doesNotMatch(html, />Assets</);
  assert.doesNotMatch(html, /School|College/);
  assert.doesNotMatch(html, />(Not yet|Pending)</);
});

test("Rao profile has sourced session work and a narrow 2024 margin", async () => {
  const html = await render("rao-rajendra-singh");
  assert.match(html, />111</);
  assert.match(html, />22</);
  assert.match(html, /1,615/);
});

test("every curated profile renders a name, the ECI result and sources, with no empty boxes", async () => {
  for (const slug of listPersonSlugs()) {
    const html = await render(slug);
    assert.match(html, /<h1\b[^>]*>[^<]+<\/h1>/, slug);
    assert.match(html, /How the 2024 vote went/, slug);
    assert.match(html, /Constituency Wise Detailed Result/, slug);
    assert.ok(sections(html).includes("sources"), slug);
    assert.doesNotMatch(html, />(Not yet|Pending)</, slug);
  }
});
