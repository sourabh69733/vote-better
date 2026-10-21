import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import PersonPage from "../app/people/[slug]/page";
import { listPersonSlugs } from "./verified-profile";

const render = async (slug: string) => renderToStaticMarkup(await PersonPage({ params: Promise.resolve({ slug }) }));
const tabs = (html: string) => [...html.matchAll(/role="tab"[^>]*>([^<]+)</g)].map((match) => match[1]);

test("sitting MP profile leads with office, result and filled key facts", async () => {
  const html = await render("manju-sharma");
  assert.match(html, /Sitting MP/);
  assert.match(html, /Sitting Lok Sabha MP for Jaipur, Rajasthan, in office for 2 years, 3 months/);
  assert.match(html, /Won by 3\.32 lakh votes over Pratap Singh Khachariyawas/);
  assert.match(html, /Age at 2024 filing/);
  assert.match(html, /₹2\.37 crore/);
  assert.match(html, /Declared cases/);
  assert.deepEqual(tabs(html), ["Story", "Work", "Elections", "Money and cases", "Sources"]);
  assert.match(html, /Current party · checked 2 Oct 2026/);
  assert.match(html, /Member of Parliament, 18th Lok Sabha, Jaipur/);
  assert.match(html, /4 Jun 2024 to present/);
  assert.equal((html.match(/>Current office</g) ?? []).length, 1);
  assert.match(html, /Official profile/);
});

test("sitting MP story and work keep sourced history without inventing outcomes", async () => {
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
  assert.match(html, /See all 137 questions/);
  assert.match(html, /8 complete session feeds/);
  assert.match(html, /Outcomes are not assessed here/);
  assert.match(html, /Questions by session/);
  assert.match(html, /Sessions 1-8/);
  assert.match(html, /48 debate records/);
  assert.match(html, /some entries were laid rather than spoken/);
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
  assert.match(html, /Assets declared/);
  assert.match(html, /candidate_id=419/);
  assert.match(html, /href="\/seats\/rajasthan\/jaipur"/);
  assert.ok(!tabs(html).includes("Work"));
  assert.doesNotMatch(html, /Official profile/);
});

test("a candidate with only an official filing age leaves other fields empty", async () => {
  const html = await render("jaipur-lok-sabha-2024-candidate-row-07");
  assert.match(html, /Pradeep Verma/);
  assert.match(html, /Age at filing/);
  assert.doesNotMatch(html, /Education declared/);
  assert.doesNotMatch(html, /Assets declared/);
  assert.doesNotMatch(html, /School|College/);
  assert.match(html, /Not yet/);
});

test("Rao profile has sourced session work and a narrow 2024 margin", async () => {
  const html = await render("rao-rajendra-singh");
  assert.match(html, /See all 111 questions/);
  assert.match(html, /22 debate records/);
  assert.match(html, /Won by 1,615 votes/);
  assert.doesNotMatch(html, /Earlier sourced examples/);
});

test("every curated profile renders a name, its election, the ECI result and sources", async () => {
  for (const slug of listPersonSlugs()) {
    const html = await render(slug);
    assert.match(html, /<h1\b[^>]*>[^<]+<\/h1>/, slug);
    assert.match(html, /Checked sources/, slug);
    assert.match(html, /Lok Sabha, 2024/, slug);
    assert.match(html, /ECI 2024 results|Constituency Wise Detailed Result/, slug);
  }
});
