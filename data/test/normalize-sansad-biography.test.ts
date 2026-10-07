import assert from "node:assert/strict";
import test from "node:test";

import type { Snapshot } from "../src/contracts.js";
import { normalizeSansadBiography, normalizeSansadPositions } from "../src/normalize/sansad-biography.js";

const capturedAt = "2026-10-07T08:00:00.000Z";
const snapshot = (url: string): Snapshot => ({ id: "snapshot-1", sourceId: "source-1", url,
  contentHash: `sha256:${"a".repeat(64)}`, capturedAt, recordedAt: capturedAt });

test("biography extracts sourced public profile fields without exposing contact or family details", () => {
  const source = snapshot("https://sansad.in/api_ls/member/5619?locale=en");
  const drafts = normalizeSansadBiography(source, {
    mpsno: 5619, fullName: "Smt. Manju Sharma", dateOfBirth: "02-Sep-1960",
    education: "<body>MA, LLB<br>University of Rajasthan</body>", mainProfessionName: "Social Reformer",
    photoUrl: "https://sansad.in/getFile/dms/fetch/photo", twitter: "https://x.com/example",
    permanentFaddr: "Private address", personalPhone: "0000000000", fatherName: "Parent",
  }, 5619, capturedAt);
  assert.equal(drafts.find((item) => item.predicate === "person.birthDate")?.normalizedValue, "1960-09-02");
  assert.equal(drafts.find((item) => item.predicate === "person.educationStatement")?.normalizedValue,
    "MA, LLB; University of Rajasthan");
  assert.equal(drafts.find((item) => item.predicate === "person.socialProfile")?.normalizedValue, "https://x.com/example");
  assert.ok(drafts.every((item) => !/phone|address|father/i.test(item.locator)));
  assert.ok(drafts.every((item) => item.locator.startsWith("member[mpsno=5619].")));
  assert.ok(drafts.every((item) => item.validFrom === undefined));
  assert.ok(source.url.includes("5619"));
});

test("biography rejects mismatched member identity and malformed dates", () => {
  const source = snapshot("https://sansad.in/api_ls/member/5619?locale=en");
  assert.throws(() => normalizeSansadBiography(source, { mpsno: 5620 }, 5619, capturedAt), /member ID/);
  assert.throws(() => normalizeSansadBiography(source, { mpsno: 5619, dateOfBirth: "31-Feb-1960" }, 5619, capturedAt), /birth date/);
});

test("optional malformed links and empty HTML do not block other sourced fields", () => {
  const source = snapshot("https://sansad.in/api_ls/member/5619?locale=en");
  const drafts = normalizeSansadBiography(source, {
    mpsno: 5619, fullName: "Smt. Manju Sharma", education: "<body> </body>",
    twitter: "not a URL", photoUrl: "http://example.com/photo.jpg",
  }, 5619, capturedAt);
  assert.ok(drafts.some((item) => item.predicate === "person.name"));
  assert.ok(!drafts.some((item) => ["person.educationStatement", "person.socialProfile", "person.photoUrl"].includes(item.predicate)));
});

test("positions preserve title, raw period and only supported date precision", () => {
  const source = snapshot("https://sansad.in/api_ls/member/positionHeld?mpCode=5619&locale=en");
  const drafts = normalizeSansadPositions(source, [
    { period: "24-Feb-2025 - ", positionHeld: "Member, Committee on Petitions" },
    { period: "June 2024", positionHeld: "Elected to 18th Lok Sabha" },
    { period: "date unclear", positionHeld: "Earlier role" },
  ], 5619, capturedAt);
  assert.equal(drafts.length, 3);
  assert.deepEqual(drafts[0].validFrom, { value: "2025-02-24", precision: "day", originalText: "24-Feb-2025" });
  assert.deepEqual(drafts[1].validFrom, { value: "2024-06", precision: "month", originalText: "June 2024" });
  assert.equal(drafts[2].validFrom, undefined);
  assert.deepEqual(drafts[0].normalizedValue,
    { title: "Member, Committee on Petitions", period: "24-Feb-2025 -" });
});

test("positions reject wrong source member and incomplete entries", () => {
  const source = snapshot("https://sansad.in/api_ls/member/positionHeld?mpCode=5620&locale=en");
  assert.throws(() => normalizeSansadPositions(source, [], 5619, capturedAt), /member ID/);
  assert.throws(() => normalizeSansadPositions(snapshot("https://sansad.in/api_ls/member/positionHeld?mpCode=5619&locale=en"),
    [{ period: "2024" }], 5619, capturedAt), /positionHeld/);
});
