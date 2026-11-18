import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { lookupResearchPin } from "./pin-preview";

test("research lookup shows all possible areas without selecting a representative", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vote-better-pin-"));
  const path = join(directory, "draft.json");
  await writeFile(path, JSON.stringify({
    reviewStatus: "unreviewed", generatedAt: "2026-10-06T10:00:00.000Z",
    sources: { pins: { url: "https://data.gov.in/pins" }, areas: { url: "https://gov.in/areas" } },
    areas: { "806": { label: "JAIPUR RURAL", state: "RAJASTHAN" }, "807": { label: "JAIPUR", state: "RAJASTHAN" } },
    pins: { "302002": { status: "multiple-possible", possibleAreaIds: ["806", "807"] } },
  }));
  const result = await lookupResearchPin("302002", path);
  assert.equal(result.status, "possible");
  if (result.status === "possible") {
    assert.deepEqual(result.areas.map((area) => area.label), ["JAIPUR RURAL", "JAIPUR"]);
    assert.deepEqual(result.areas.map((area) => area.published), [
      { areaId: "jaipur-rural-lok-sabha", holders: [{ name: "Rao Rajendra Singh", slug: "rao-rajendra-singh", office: "Member of Parliament", reviewedOn: "2026-10-03" }] },
      { areaId: "jaipur-lok-sabha", holders: [{ name: "Manju Sharma", slug: "manju-sharma", office: "Member of Parliament", reviewedOn: "2026-10-02" }] },
    ]);
    assert.equal(result.reviewStatus, "unreviewed");
  }
  assert.equal((await lookupResearchPin("30200x", path)).status, "invalid");
  assert.equal((await lookupResearchPin("302003", path)).status, "not-covered");
});

test("unmapped or inconsistent boundary areas do not inherit an MP profile", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vote-better-pin-"));
  const path = join(directory, "draft.json");
  await writeFile(path, JSON.stringify({
    reviewStatus: "unreviewed", generatedAt: "2026-10-06T10:00:00.000Z",
    areas: { "806": { label: "OTHER AREA", state: "RAJASTHAN" }, "999": { label: "JAIPUR", state: "RAJASTHAN" } },
    pins: { "302003": { status: "multiple-possible", possibleAreaIds: ["806", "999"] } },
  }));
  const result = await lookupResearchPin("302003", path);
  assert.equal(result.status, "possible");
  if (result.status === "possible") {
    assert.deepEqual(result.areas.map((area) => area.published), [undefined, undefined]);
  }
});

test("national draft links a PIN area to a sourced provisional MP profile", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vote-better-pin-"));
  const pinPath = join(directory, "pins.json");
  const rosterPath = join(directory, "members.json");
  await writeFile(pinPath, JSON.stringify({
    schemaVersion: 1, reviewStatus: "unreviewed", generatedAt: "2026-10-07T10:00:00.000Z",
    sources: { areas: { inputSha256: "sha256:boundary" } },
    areas: { "918": { label: "AGRA (SC)", state: "UTTAR PRADESH" } },
    pins: { "282001": { status: "single-possible", possibleAreaIds: ["918"] } },
  }));
  await writeFile(rosterPath, JSON.stringify({
    schemaVersion: 1, reviewStatus: "unreviewed", boundarySource: { inputSha256: "sha256:boundary" },
    rosterSnapshots: [{ id: "snapshot-1", url: "https://sansad.in/api_ls/member?page=1", capturedAt: "2026-10-06T10:00:00.000Z" }],
    members: [{ id: 31, name: "S P Singh Baghel", party: "BJP", state: "Uttar Pradesh", constituency: "Agra", status: "Sitting", snapshotId: "snapshot-1" }],
    proposed: [], suggested: [{ areaId: "918", memberId: 31, reason: "seat-suffix" }],
  }));
  const result = await lookupResearchPin("282001", pinPath, rosterPath);
  assert.equal(result.status, "possible");
  if (result.status === "possible") {
    assert.deepEqual(result.areas[0].draftMember, {
      id: 31, name: "S P Singh Baghel", party: "BJP", matchKind: "suggested",
      sourceUrl: "https://sansad.in/api_ls/member?page=1", capturedAt: "2026-10-06T10:00:00.000Z",
    });
  }
  await writeFile(pinPath, (await readFile(pinPath, "utf8")).replace("sha256:boundary", "sha256:changed"));
  const changed = await lookupResearchPin("282001", pinPath, rosterPath);
  assert.equal(changed.status, "possible");
  if (changed.status === "possible") assert.equal(changed.areas[0].draftMember, undefined);
});
