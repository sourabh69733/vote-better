import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { lookupMyArea, pinLookupAvailable } from "./my-area";

const file = join(mkdtempSync(join(tmpdir(), "pin-")), "lookup.json");
writeFileSync(file, JSON.stringify({
  generatedAt: "2026-11-01T00:00:00.000Z",
  areas: { "08054": { label: "MALVIYA NAGAR" }, "08055": { label: "Sanganer" }, "08056": { label: "Somewhere Else" } },
  pins: {
    "302017": { possibleAreaIds: ["08054"], areaShares: { "08054": 1 } },
    "302001": { possibleAreaIds: ["08054", "08055", "08056"], areaShares: { "08054": 0.2, "08055": 0.7, "08056": 0.1 } },
  },
}));

test("a PIN inside one assembly seat gives its MLA's seat and the Lok Sabha seat around it", async () => {
  const result = await lookupMyArea("302017", file);
  assert.equal(result.status, "found");
  if (result.status !== "found") return;
  assert.equal(result.seats.length, 1);
  assert.equal(result.seats[0].assembly.name, "Malviya Nagar");
  assert.equal(result.seats[0].parliament?.name, "Jaipur");
});

test("a PIN across seats lists them by share of land, and drops a seat whose name disagrees with ECI", async () => {
  const result = await lookupMyArea("302001", file);
  assert.equal(result.status, "found");
  if (result.status !== "found") return;
  assert.deepEqual(result.seats.map((seat) => [seat.assembly.name, seat.share]), [["Sanganer", 0.7], ["Malviya Nagar", 0.2]]);
});

test("bad, unknown and missing lookups say so instead of guessing", async () => {
  assert.equal((await lookupMyArea("12ab", file)).status, "invalid");
  assert.equal((await lookupMyArea("110001", file)).status, "not-covered");
  assert.equal((await lookupMyArea("302017", join(tmpdir(), "no-such-file.json"))).status, "unavailable");
  assert.equal(pinLookupAvailable(join(tmpdir(), "no-such-file.json")), false);
});
