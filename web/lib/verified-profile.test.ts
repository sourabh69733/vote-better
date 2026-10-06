import assert from "node:assert/strict";
import test from "node:test";
import { getPersonProfile, listPersonSlugs } from "./verified-profile";

test("person profiles resolve by slug without route-specific names", () => {
  assert.equal(listPersonSlugs().length, 14);
  assert.equal(getPersonProfile("manju-sharma")?.name, "Manju Sharma");
  assert.equal(getPersonProfile("rao-rajendra-singh")?.candidacies[0].votes, 617877);
  assert.equal(getPersonProfile("unknown-person"), null);
});

test("every published Jaipur result has a sourced candidate profile", async () => {
  const { jaipurPublication } = await import("./publication");
  for (const row of jaipurPublication.dataset.candidacies) {
    const profile = getPersonProfile(row.personId);
    assert.ok(profile, row.name);
    assert.equal(profile.name.toLowerCase(), row.name.toLowerCase());
    assert.equal(profile.candidacies[0].votes, row.votes);
    assert.equal(profile.candidacies[0].resultDate, "2024-06-04");
    assert.ok(profile.sources.some((source) => source.url === row.sourceUrl));
  }
});

test("affidavit summaries keep filing-time details and their individual sources", () => {
  const manju = getPersonProfile("manju-sharma");
  assert.ok(manju);
  assert.deepEqual(manju.disclosures[0], {
    election: "Jaipur Lok Sabha, 2024",
    ageAtFiling: 64,
    education: "Post Graduate",
    declaredCases: 0,
    declaredAssetsRupees: 23661843,
    declaredLiabilitiesRupees: 4169859,
    sourceId: "adr-jaipur-2024-417",
  });
  assert.equal(manju.sources.find((item) => item.id === manju.disclosures[0].sourceId)?.url,
    "https://www.myneta.info/LokSabha2024/candidate.php?candidate_id=417");
  const pradeep = getPersonProfile("jaipur-lok-sabha-2024-candidate-row-07");
  assert.equal(pradeep?.disclosures[0]?.ageAtFiling, 29);
  assert.equal(pradeep?.disclosures[0]?.education, undefined);
  assert.match(pradeep?.sources.find((item) => item.id === pradeep.disclosures[0].sourceId)?.url ?? "", /^https:\/\/affidavit\.eci\.gov\.in\/show-profile\//);
});

test("office status keeps its own review date, separate from later profile sources", () => {
  const manju = getPersonProfile("manju-sharma");
  assert.ok(manju);
  assert.equal(manju.officeTerms[0].reviewedOn, "2026-10-02");
  assert.equal(manju.reviewedOn, "2026-10-06");
});
