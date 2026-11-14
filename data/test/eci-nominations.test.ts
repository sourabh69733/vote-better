import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildPublication, collectNominations, writePublication, type NominationTarget } from "../src/eci-nominations.js";
import { parseNominationPage, parseSeatOptions, seatCandidates } from "../src/normalize/eci-nominations.js";

// The portal's markup, cut down to what the parser reads.
const counter = (label: string, value: number) => `<button type="submit" name="submitName" value=""><div class="box-inner bg-grn">
  <p><span>${value}</span></p>
  <h4>${label}</h4></div></button>`;

type Card = [name: string, party: string, status: string, constituency?: string];

function page(cards: Card[], counts = { All: 0, Accepted: 0, Rejected: 0, Withdrawn: 0, Contesting: 0 }) {
  return `${Object.entries(counts).map(([label, value]) => counter(label, value)).join("\n")}
  <table><tbody>${cards.map(([name, party, status, constituency = "THATTANCHAVADY"]) => `<tr><td><div class="details-name">
    <h4 class="bg-blu">${name}</h4>
    <div class="container-fluid"><div class="row"><div class="col-sm-6 left-party">
      <p><strong>Party :</strong> ${party}</p>
      <p><strong>Status :</strong> <strong><font color=#00a65a>${status}</font></strong></p>
    </div><div class="col-sm-6 right-party">
      <p><strong>State :</strong> Puducherry</p>
      <p><strong>Constituency :</strong> ${constituency}</p>
    </div></div><!-- End of row Div --></div></div></td></tr>`).join("")}</tbody></table>
  ${cards.length ? "" : "--------No Data"}`;
}

test("reads counters and cards, with ballot numbers on the contesting list", () => {
  const parsed = parseNominationPage(page([["1. E. VINAYAGAM", "Indian National Congress", "Accepted"], ["S. KARTHIKUMARI", "Naam Tamilar Katchi", "Rejected"]],
    { All: 15, Accepted: 11, Rejected: 4, Withdrawn: 0, Contesting: 11 }));
  assert.deepEqual(parsed.counts, { all: 15, accepted: 11, rejected: 4, withdrawn: 0, contesting: 11 });
  assert.deepEqual(parsed.cards[0], { name: "E. VINAYAGAM", party: "Indian National Congress", status: "accepted", state: "Puducherry", constituency: "THATTANCHAVADY", ballot: 1 });
  assert.equal(parsed.cards[1].ballot, null);
  assert.equal(parsed.cards[1].status, "rejected");
});

test("fails loudly when the portal changes", () => {
  assert.throws(() => parseNominationPage("<html>maintenance</html>"), /no all, accepted/);
  assert.throws(() => parseNominationPage(page([["A", "Independent", "Scrutiny"]])), /unknown nomination status "Scrutiny"/);
});

test("reads the seat picker", () => {
  assert.deepEqual(parseSeatOptions('<option selected="selected" value="">Select Constituency</option><option value="101">DHARAPURAM</option><option value="35">MADURANTAKAM</option>'),
    [{ number: 101, name: "DHARAPURAM" }, { number: 35, name: "MADURANTAKAM" }]);
});

test("turns nomination papers into one row per candidate", () => {
  const card = (name: string, party: string, status: "accepted" | "rejected" | "withdrawn" | "filed", ballot: number | null = null) =>
    ({ name, party, status, state: "Puducherry", constituency: "THATTANCHAVADY", ballot });
  const all = [
    card("S. KARTHIKUMARI", "Naam Tamilar Katchi", "rejected"), card("S. KARTHIKUMARI", "Naam Tamilar Katchi", "accepted"),
    card("ASHOK ANAND", "All India N.R. Congress", "accepted"), card("ANANDANE", "All India N.R. Congress", "rejected"),
    card("M. NITHYA", "Independent", "withdrawn"), card("R. JAYABALAN", "Independent", "accepted"), card("NEW", "Independent", "filed"),
  ];
  const contesting = [card("ASHOK ANAND", "All India N.R. Congress", "accepted", 1), card("S. KARTHIKUMARI", "Naam Tamilar Katchi", "accepted", 2)];
  assert.deepEqual(seatCandidates(all, contesting).map((row) => [row.name, row.status, row.ballot, row.nominations]), [
    ["ASHOK ANAND", "contesting", 1, 1],
    ["S. KARTHIKUMARI", "contesting", 2, 2],
    ["R. JAYABALAN", "accepted", null, 1],
    ["NEW", "filed", null, 1],
    ["M. NITHYA", "withdrawn", null, 1],
    ["ANANDANE", "rejected", null, 1],
  ]);
  assert.throws(() => seatCandidates(all, [card("STRANGER", "Independent", "accepted", 3)]), /no nomination on the full list/);
});

const target: NominationTarget = { electionId: "test-bye-election", title: "test bye-election", electionType: "34-AC-BYE-4-63", contests: [{ election: "34-AC-BYE-4-63", states: ["U07"] }] };

function portal(contestingCount = 2) {
  const counts = { All: 12, Accepted: 10, Rejected: 2, Withdrawn: 0, Contesting: contestingCount };
  const all: Card[] = Array.from({ length: 12 }, (_, index) => [`CANDIDATE ${index + 1}`, "Independent", index < 10 ? "Accepted" : "Rejected"]);
  const requested: string[] = [];
  const fetchPage = async (url: string) => {
    requested.push(url);
    const { pathname, searchParams } = new URL(url);
    if (pathname === "/allConstList/U07/34/AC/63/BYE/1") return '<option selected="selected" value="">Select</option><option value="9">THATTANCHAVADY</option>';
    const pageNumber = Number(searchParams.get("page") ?? 1);
    if (searchParams.get("submitName") === "100") return page(pageNumber === 1 ? [["1. CANDIDATE 2", "Independent", "Accepted"], ["2. CANDIDATE 1", "Independent", "Accepted"]] : [], counts);
    return page(all.slice((pageNumber - 1) * 10, pageNumber * 10), counts);
  };
  return { fetchPage, requested };
}

test("collects every page of every seat and checks the totals", async () => {
  const { fetchPage, requested } = portal();
  const [seat] = await collectNominations(fetchPage, target);
  assert.equal(requested.length, 4);
  assert.equal(seat.name, "Thattanchavady");
  assert.equal(seat.slug, "thattanchavady");
  assert.equal(seat.stateSlug, "puducherry");
  assert.equal(seat.kind, "assembly");
  assert.deepEqual(seat.papers, { all: 12, accepted: 10, rejected: 2, withdrawn: 0 });
  assert.equal(seat.candidates.length, 12);
  assert.deepEqual(seat.candidates.slice(0, 2).map((row) => [row.name, row.sourceName]), [["Candidate 2", "CANDIDATE 2"], ["Candidate 1", "CANDIDATE 1"]]);
  assert.equal(seat.sourceUrl, "https://affidavit.eci.gov.in/CandidateCustomFilter?electionType=34-AC-BYE-4-63&election=34-AC-BYE-4-63&states=U07&phase=1&constId=9");

  await assert.rejects(collectNominations(portal(3).fetchPage, target), /read 2 cards .* counts 3/);
});

test("rewrites the file only when the lists change", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "nominations-"));
  const seats = await collectNominations(portal().fetchPage, target);
  assert.equal(await writePublication(buildPublication(target, seats, "2026-09-20"), directory), true);
  assert.equal(await writePublication(buildPublication(target, seats, "2026-09-21"), directory), false);
  const saved = JSON.parse(await readFile(path.join(directory, "test-bye-election.json"), "utf8"));
  assert.equal(saved.changedOn, "2026-09-20");
  seats[0].candidates[0].status = "withdrawn";
  assert.equal(await writePublication(buildPublication(target, seats, "2026-09-22"), directory), true);
});
