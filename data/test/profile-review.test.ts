import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createHash, randomInt, randomUUID } from "node:crypto";

import { createTestPool, prepareTestDatabase } from "./db.js";
import { CivicStore } from "../src/store.js";
import { approveProfileFields, linkProfileIdentity, loadProfileReview } from "../src/profile-review.js";
import { loadProfilePreview } from "../src/profile-preview.js";
import { loadDraftProfile, listCollectedBiographyIds } from "../src/profile-draft.js";

const pool = createTestPool();
const store = new CivicStore(pool);
before(async () => { await prepareTestDatabase(pool); });
after(async () => { await pool.end(); });

async function fixture(memberId: number, name = "Manju Sharma", rosterName = name) {
  const rosterUrl = `https://sansad.in/api_ls/member?loksabha=18&page=1&size=100&memberStatus=s`;
  const rosterSource = await store.saveSource({ authority: "Parliament of India", url: rosterUrl, documentType: "roster" });
  const rosterSnapshot = await store.saveSnapshot(rosterSource.id, rosterUrl,
    `sha256:${createHash("sha256").update(randomUUID()).digest("hex")}`, new Date().toISOString());
  await store.saveObservations(rosterSnapshot.id, [
    { locator: `membersDtoList[mpsno=${memberId}].mpsno`, predicate: "person.sansadMemberId",
      rawValue: String(memberId), normalizedValue: String(memberId), normalizedAt: new Date().toISOString(),
      normalizerVersion: "sansad-ls-members-v1" },
    { locator: `membersDtoList[mpsno=${memberId}].mpFirstLastName`, predicate: "person.name",
      rawValue: `Smt. ${rosterName}`, normalizedValue: `Smt. ${rosterName}`, normalizedAt: new Date().toISOString(),
      normalizerVersion: "sansad-ls-members-v1" },
  ]);
  const biographyUrl = `https://sansad.in/api_ls/member/${memberId}?locale=en`;
  const positionsUrl = `https://sansad.in/api_ls/member/positionHeld?mpCode=${memberId}&locale=en`;
  const rows = [
    { url: biographyUrl, version: "sansad-ls-biography-v1", observations: [
      { locator: `member[mpsno=${memberId}].mpsno`, predicate: "person.sansadMemberId", value: String(memberId) },
      { locator: `member[mpsno=${memberId}].fullName`, predicate: "person.name", value: `Smt. ${name}` },
      { locator: `member[mpsno=${memberId}].mainProfessionName`, predicate: "person.profession", value: "Social Reformer" },
    ] },
    { url: positionsUrl, version: "sansad-ls-positions-v2", observations: [
      { locator: `member[mpsno=${memberId}].positions`, predicate: "office.positionsHeld", value: [] },
    ] },
  ];
  for (const item of rows) {
    const source = await store.saveSource({ authority: "Parliament of India", url: item.url, documentType: "JSON" });
    const snapshot = await store.saveSnapshot(source.id, item.url,
      `sha256:${createHash("sha256").update(randomUUID()).digest("hex")}`, new Date().toISOString());
    await store.saveObservations(snapshot.id, item.observations.map((observation) => ({
      locator: observation.locator, predicate: observation.predicate,
      rawValue: JSON.stringify(observation.value), normalizedValue: observation.value,
      normalizedAt: new Date().toISOString(), normalizerVersion: item.version,
    })));
  }
  const person = await pool.query("INSERT INTO person (stable_key, display_name) VALUES ($1, $2) RETURNING id",
    [`test-${randomUUID()}`, name]);
  return { personId: person.rows[0].id as string };
}

test("profile report contains exact source hashes and a stable review token", async () => {
  const memberId = randomInt(100_000, 10_000_000);
  await fixture(memberId);
  const first = await loadProfileReview(pool, memberId);
  const second = await loadProfileReview(pool, memberId);
  assert.equal(first.token, second.token);
  assert.equal(first.observations.length, 4);
  assert.ok(first.sources.every((source) => /^sha256:[0-9a-f]{64}$/.test(source.contentHash)));
  assert.equal(first.name, "Smt. Manju Sharma");
  assert.equal(first.rosterName, "Smt. Manju Sharma");
});

test("profile report prefers the current positions normalizer for one snapshot", async () => {
  const memberId = randomInt(100_000, 10_000_000);
  await fixture(memberId);
  const snapshot = await pool.query("SELECT id FROM snapshot WHERE url = $1 ORDER BY captured_at DESC LIMIT 1",
    [`https://sansad.in/api_ls/member/positionHeld?mpCode=${memberId}&locale=en`]);
  await store.saveObservations(snapshot.rows[0].id, [{
    locator: `member[mpsno=${memberId}].positions`, predicate: "office.positionsHeld",
    rawValue: "[{title:role}]", normalizedValue: [{ title: "Member, Committee", period: "2024" }],
    normalizedAt: new Date().toISOString(), normalizerVersion: "sansad-ls-positions-v3",
  }]);
  const report = await loadProfileReview(pool, memberId);
  assert.equal(report.observations.filter((item) => item.predicate === "office.positionsHeld").length, 1);
  assert.deepEqual(report.observations.find((item) => item.predicate === "office.positionsHeld")?.value,
    [{ title: "Member, Committee", period: "2024" }]);
});

test("a biography name that conflicts with the official roster cannot be linked", async () => {
  const memberId = randomInt(100_000, 10_000_000);
  await fixture(memberId, "Manju Sharma", "Different Person");
  await assert.rejects(() => loadProfileReview(pool, memberId), /roster/);
});

test("official professional titles do not create a false name conflict", async () => {
  const memberId = randomInt(100_000, 10_000_000);
  await fixture(memberId, "Prof. S P Singh Baghel", "S P Singh Baghel");
  const report = await loadProfileReview(pool, memberId);
  assert.equal(report.name, "Smt. Prof. S P Singh Baghel");
  assert.equal(report.rosterName, "Smt. S P Singh Baghel");
});

test("official regional honorifics do not create false identity conflicts", async () => {
  for (const [biographyName, rosterName] of [
    ["Thiru Dayanidhi Maran", "Dayanidhi Maran"],
    ["Chh. Udayanraje Pratapsinha Maharaj Bhonsle", "Udayanraje Pratapsinha Maharaj Bhonsle"],
    ["Km. Shobha Karandlaje", "Shobha Karandlaje"],
  ]) {
    const memberId = randomInt(100_000, 10_000_000);
    await fixture(memberId, biographyName, rosterName);
    assert.equal((await loadProfileReview(pool, memberId)).memberId, memberId);
  }
});

test("explicit identity review links all fields for one official ID", async () => {
  const memberId = randomInt(100_000, 10_000_000);
  const { personId } = await fixture(memberId);
  const report = await loadProfileReview(pool, memberId);
  const linked = await linkProfileIdentity(pool, memberId, personId, report.token, "reviewer-test", "Checked member ID and name");
  assert.equal(linked, 4);
  const repeat = await linkProfileIdentity(pool, memberId, personId, report.token, "reviewer-test", "Checked again");
  assert.equal(repeat, 0);
  const matches = await pool.query("SELECT count(*)::int AS count FROM entity_match WHERE entity_id = $1 AND status = 'confirmed'", [personId]);
  assert.equal(matches.rows[0].count, 4);
});

test("review token and person name block stale or wrong links", async () => {
  const memberId = randomInt(100_000, 10_000_000);
  const { personId } = await fixture(memberId);
  const report = await loadProfileReview(pool, memberId);
  await assert.rejects(() => linkProfileIdentity(pool, memberId, personId, "stale", "reviewer-test", "Checked"), /token/);
  const wrong = await pool.query("INSERT INTO person (stable_key, display_name) VALUES ($1, $2) RETURNING id",
    [`test-${randomUUID()}`, "Another Person"]);
  await assert.rejects(() => linkProfileIdentity(pool, memberId, wrong.rows[0].id, report.token,
    "reviewer-test", "Checked"), /name/);
});

test("selected profile fields approve together only after identity confirmation", async () => {
  const memberId = randomInt(100_000, 10_000_000);
  const { personId } = await fixture(memberId);
  const report = await loadProfileReview(pool, memberId);
  await assert.rejects(() => approveProfileFields(pool, memberId, report.token,
    ["person.profession"], "reviewer-test", "Checked source"), /identity/);
  await linkProfileIdentity(pool, memberId, personId, report.token, "reviewer-test", "Checked identity");
  const approved = await approveProfileFields(pool, memberId, report.token,
    ["person.profession", "office.positionsHeld"], "reviewer-test", "Checked exact source fields");
  assert.equal(approved, 2);
  const decisions = await pool.query(`SELECT count(*)::int AS count FROM review_observation ro
    JOIN review_event r ON r.id=ro.review_id WHERE ro.observation_id = ANY($1::uuid[]) AND r.decision='approved'`,
    [report.observations.filter((item) => ["person.profession", "office.positionsHeld"].includes(item.predicate)).map((item) => item.id)]);
  assert.equal(decisions.rows[0].count, 2);
  await assert.rejects(() => approveProfileFields(pool, memberId, report.token,
    ["person.profession"], "reviewer-test", "Repeat"), /already approved/);
});

test("private preview exports only current approved and linked observations", async () => {
  const memberId = randomInt(100_000, 10_000_000);
  const { personId } = await fixture(memberId);
  const report = await loadProfileReview(pool, memberId);
  await linkProfileIdentity(pool, memberId, personId, report.token, "reviewer-test", "Checked identity");
  await approveProfileFields(pool, memberId, report.token, ["person.profession"], "reviewer-test", "Checked source");
  const preview = await loadProfilePreview(pool, memberId);
  assert.equal(preview.personName, "Manju Sharma");
  assert.deepEqual(preview.facts.map((item) => item.predicate), ["person.profession"]);
  assert.match(preview.facts[0].source.contentHash, /^sha256:/);
  assert.match(preview.facts[0].reviewedAt, /Z$/);
  assert.equal(preview.reviewStatus, "partial");
});

test("draft profile includes every current sourced field before review", async () => {
  const memberId = randomInt(100_000, 10_000_000);
  await fixture(memberId);
  const draft = await loadDraftProfile(pool, memberId);
  assert.equal(draft.access, "local-unverified-profile");
  assert.equal(draft.personName, "Smt. Manju Sharma");
  assert.deepEqual(draft.facts.map((fact) => fact.predicate), [
    "person.name", "person.profession", "person.sansadMemberId", "office.positionsHeld",
  ]);
  assert.ok(draft.facts.every((fact) => fact.source.contentHash.startsWith("sha256:")));
  assert.ok(draft.facts.every((fact) => fact.source.capturedAt.endsWith("Z")));
  assert.ok((await listCollectedBiographyIds(pool)).includes(memberId));
  const report = await loadProfileReview(pool, memberId);
  const checked = await loadDraftProfile(pool, memberId, {
    memberId, token: report.token, status: "checked", checkedAt: "2026-10-07T10:00:00.000Z",
  });
  assert.equal(checked.sourceCheck?.method, "sansad-snapshot-replay-v1");
  assert.equal((await loadDraftProfile(pool, memberId, {
    memberId, token: "stale", status: "checked", checkedAt: "2026-10-07T10:00:00.000Z",
  })).sourceCheck, undefined);
});

test("rejected profile fields disappear from the next draft export", async () => {
  const memberId = randomInt(100_000, 10_000_000);
  await fixture(memberId);
  const report = await loadProfileReview(pool, memberId);
  const profession = report.observations.find((item) => item.predicate === "person.profession");
  assert.ok(profession);
  await store.recordDecision([profession.id], "rejected", "reviewer-test", "Source field does not identify this person");
  const draft = await loadDraftProfile(pool, memberId);
  assert.equal(draft.facts.some((fact) => fact.predicate === "person.profession"), false);
  assert.equal(draft.facts.some((fact) => fact.predicate === "office.positionsHeld"), true);
});
