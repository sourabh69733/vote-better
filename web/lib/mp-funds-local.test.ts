import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { esakshiSeatName, esakshiStateName, getSeatFunds, unmatchedSeats } from "./mp-funds-local";
import { findSeat } from "./results";
import { esakshiSeats } from "@/records/esakshi-links";

const member = (personId: string, state: string, constituency: string, officialName: string) => ({
  personId, officialName, constituency, state, constituencyId: Number(personId.split("-")[1]), tenure: "18th Lok Sabha", tenureStart: "2024-06-04", allocated: 1000,
  totals: { recommended: { count: 0, amount: 0 }, sanctioned: { count: 0, amount: 0 }, completed: { count: 0, amount: 0 }, payments: { count: 0, amount: 0 } },
  works: [],
});

const file = join(mkdtempSync(join(tmpdir(), "seat-funds-")), "archive.json");
writeFileSync(file, JSON.stringify({
  schemaVersion: 1,
  collectedAt: "2026-11-15T00:00:00.000Z",
  source: { title: "eSAKSHI", publisher: "MoSPI", url: "https://mplads.mospi.gov.in/digigov/dashboard.html" },
  members: [
    member("esakshi-357", "Rajasthan", "JAIPUR", "MANJU SHARMA"),
    member("esakshi-339", "Rajasthan", "UDAIPUR(ST)", "MANNA LAL RAWAT"),
    member("esakshi-1", "Rajasthan", "NOWHERE", "NOBODY"),
    member("esakshi-334", "Rajasthan", "AJMER", "Bhagirath Chaudhary"),
    member("esakshi-99", "Delhi", "CHANDINI CHOWK", "Praveen Khandelwal"),
  ],
}));

test("eSAKSHI's reserved-seat marks and state article are dropped before matching", () => {
  assert.equal(esakshiSeatName("UDAIPUR(ST)"), "UDAIPUR");
  assert.equal(esakshiSeatName("BIKANER (SC)"), "BIKANER");
  assert.equal(esakshiStateName("The Dadra And Nagar Haveli And Daman And Diu"), "Dadra And Nagar Haveli And Daman And Diu");
});

test("a seat's fund works are shown only for the MP eSAKSHI names", () => {
  const jaipur = { stateSlug: "rajasthan", slug: "jaipur" };
  const as = (names: string[], winner2024 = true) => ({ names, winner2024 });
  assert.equal(getSeatFunds(jaipur, as(["Manju Sharma"]), file)?.personId, "esakshi-357");
  assert.equal(getSeatFunds(jaipur, as(["Someone Else"]), file), null);
  assert.equal(getSeatFunds({ stateSlug: "rajasthan", slug: "udaipur" }, as(["Mannalal Rawat", "Manna Lal Rawat"]), file)?.personId, "esakshi-339");
  const ajmer = { stateSlug: "rajasthan", slug: "ajmer" };
  assert.equal(getSeatFunds(ajmer, as(["BHAGIRATH CHOUDHARY"]), file)?.personId, "esakshi-334", "a reviewed spelling counts for the 2024 winner");
  assert.equal(getSeatFunds(ajmer, as(["BHAGIRATH CHOUDHARY"], false), file), null, "and only for the 2024 winner");
  assert.equal(getSeatFunds({ stateSlug: "nct-of-delhi", slug: "chandni-chowk" }, as(["PRAVEEN KHANDELWAL"]), file)?.personId, "esakshi-99", "a reviewed seat spelling");
  assert.deepEqual(unmatchedSeats(file), ["Rajasthan / NOWHERE"]);
});

test("every reviewed eSAKSHI seat is a 2024 seat, used once", () => {
  const slugs = Object.values(esakshiSeats);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) {
    const [state, seat] = slug.split("/");
    assert.ok(findSeat("lok-sabha-2024", state, seat), slug);
  }
});
