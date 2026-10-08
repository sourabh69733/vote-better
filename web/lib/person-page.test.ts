import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import PersonPage from "../app/people/[slug]/page";
import { getPersonProfile, listPersonSlugs } from "./verified-profile";

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
  assert.doesNotMatch(html, /Background and timeline/);
  assert.match(html, /Election and filing records/);
});

test("every candidate profile renders its name, election record and sources", async () => {
  for (const slug of listPersonSlugs()) {
    const html = renderToStaticMarkup(await PersonPage({ params: Promise.resolve({ slug }) }));
    assert.match(html, /<h1\b[^>]*>[^<]+<\/h1>/, slug);
    assert.match(html, /Election and filing records/, slug);
    assert.match(html, /Sources and review dates/, slug);
    const timeline = getPersonProfile(slug)!.timeline;
    if (timeline.length === 1 && timeline[0].kind === "election") {
      assert.doesNotMatch(html, /href="#life"/, slug);
    }
  }
});

test("elected profile puts office and work before life history and deeper records", async () => {
  const page = await PersonPage({ params: Promise.resolve({ slug: "manju-sharma" }) });
  const html = renderToStaticMarkup(page);
  for (const heading of ["Person profile", "Offices held", "Background and timeline", "Work in office", "Official presence", "Election and filing records", "Sources and review dates"]) {
    assert.match(html, new RegExp(heading));
  }
  assert.ok(html.indexOf("Person profile") < html.indexOf("Offices held"));
  assert.ok(html.indexOf('id="offices"') < html.indexOf('id="work"'));
  assert.ok(html.indexOf('id="work"') < html.indexOf('id="life"'));
  assert.ok(html.indexOf('id="life"') < html.indexOf('id="records"'));
  assert.equal((html.match(/Current office/g) ?? []).length, 1);
  assert.match(html, /Official profile/);
  assert.match(html, /2024-06-04 to present/);
  assert.doesNotMatch(html, /Party changed/);
});

test("former candidate profile shows past roles but does not invent current office work", async () => {
  const page = await PersonPage({ params: Promise.resolve({ slug: "jaipur-lok-sabha-2024-candidate-row-01" }) });
  const html = renderToStaticMarkup(page);
  assert.match(html, /Person profile/);
  assert.match(html, /Background and timeline/);
  assert.match(html, /Party at election/);
  assert.doesNotMatch(html, /Not elected in 2024/);
  assert.doesNotMatch(html, /Work in office/);
  assert.doesNotMatch(html, /Offices held/);
  assert.doesNotMatch(html, /Official presence/);
});

test("elected profile leads with present party, background and office work", async () => {
  const html = renderToStaticMarkup(await PersonPage({ params: Promise.resolve({ slug: "manju-sharma" }) }));
  assert.match(html, /Current party · checked 2026-10-02/);
  assert.match(html, /1983 · Education/);
  assert.match(html, /M\.A\., Rajasthan University/);
  assert.match(html, /jewellery business/);
  assert.match(html, /Background and timeline/);
  assert.match(html, /LL\.B\. \(academic\)/);
  assert.match(html, /Hawa Mahal Assembly election/);
  assert.doesNotMatch(html, /Candidate-published account/);
  assert.doesNotMatch(html, /Navsari district/);
  assert.match(html, /not a continuous employment history/);
  assert.match(html, /Work in office/);
  assert.match(html, /Current term/);
  assert.match(html, /2 years, 3 months/);
  assert.match(html, /Criminal cases declared at filing/);
  assert.match(html, /137<\/strong>/);
  assert.match(html, /8 complete session feeds/);
  assert.match(html, /See all 137 questions/);
  assert.match(html, /Outcomes are not assessed here/);
  assert.ok(html.indexOf('id="work"') < html.indexOf('id="life"'));
});

test("Rao profile has sourced session work without inventing an impact", async () => {
  const html = renderToStaticMarkup(await PersonPage({ params: Promise.resolve({ slug: "rao-rajendra-singh" }) }));
  assert.match(html, /111<\/strong>/);
  assert.match(html, /See all 111 questions/);
  assert.match(html, /Outcomes are not assessed here/);
  assert.doesNotMatch(html, /Earlier sourced example/);
});

test("MP profile exposes each imported session before the question list", async () => {
  const html = renderToStaticMarkup(await PersonPage({ params: Promise.resolve({ slug: "manju-sharma" }) }));
  assert.match(html, /Questions by session/);
  assert.match(html, /How these counts were built/);
  assert.match(html, /Session 1/);
  assert.match(html, /Session 8/);
  assert.match(html, /Sessions 1-8/);
});

test("MP profile separates sourced debate records from questions", async () => {
  const manju = renderToStaticMarkup(await PersonPage({ params: Promise.resolve({ slug: "manju-sharma" }) }));
  const rao = renderToStaticMarkup(await PersonPage({ params: Promise.resolve({ slug: "rao-rajendra-singh" }) }));
  assert.match(manju, /48 debate records/);
  assert.match(rao, /22 debate records/);
  assert.match(manju, /Debates and matters/);
  assert.match(manju, /some entries were laid rather than spoken/);
});

test("former candidate shows election-time party and sourced earlier roles", async () => {
  const html = renderToStaticMarkup(await PersonPage({ params: Promise.resolve({ slug: "jaipur-lok-sabha-2024-candidate-row-01" }) }));
  assert.match(html, /Party at 2024 election/);
  assert.match(html, /Rajasthan University, 1992/);
  assert.match(html, /Elected MLA, Civil Lines/);
  assert.match(html, /Transport Minister, Rajasthan/);
  assert.doesNotMatch(html, /Current party · checked/);
});

test("profile without reviewed biography omits education and work rather than filling gaps", async () => {
  const html = renderToStaticMarkup(await PersonPage({ params: Promise.resolve({ slug: "jaipur-lok-sabha-2024-candidate-row-07" }) }));
  assert.doesNotMatch(html, /Education and work/);
  assert.doesNotMatch(html, /School/);
  assert.doesNotMatch(html, /College/);
});
