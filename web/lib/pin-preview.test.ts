import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
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
