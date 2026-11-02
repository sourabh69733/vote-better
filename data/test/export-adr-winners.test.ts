import assert from "node:assert/strict";
import test from "node:test";

import { joinWinners, parseCsv, parseWinnersPage, type DatasetRow } from "../src/export-adr-winners.js";

// MyNeta's markup, cut down to what the parser reads. The people here are invented.
const pageRow = (id: number, name: string, seat: string, cases: string, assets: string, liabilities: string) => `<tr><td>1</td>
  <td><a href=/candidate.php?candidate_id=${id}><a href=/LokSabha2024/candidate.php?candidate_id=${id}>${name}</a></a><b></td><td>${seat}</td>
  <td>BJP</td>
  <td align=center style=''>${cases}</td>	<td >Graduate</td>
  <td align=right>Rs&nbsp;${assets}<br><span> ~ 3&nbsp;Crore+</span></td>
  <td align=right>Rs&nbsp;${liabilities}<br><span> ~ 29&nbsp;Lacs+</span> </td></tr>`;

const row = (fields: Partial<DatasetRow>): DatasetRow => ({
  election_year: "2024", state: "Rajasthan", constituency: "Testpur", seat_category: "GEN", name: "Asha Rao", party: "BJP", criminal_cases: "0",
  education: "10Th Pass", age: "50", assets: "", liabilities: "", is_winner: "True", is_bye_election: "False", ...fields,
});

test("reads quoted CSV fields", () => {
  assert.deepEqual(parseCsv('name,party\n"Rao, Asha","A ""B"" C"\nOnly,Two\n'), [{ name: "Rao, Asha", party: 'A "B" C' }, { name: "Only", party: "Two" }]);
});

test("reads winner rows, including a badge around the case count, and skips the bye-election table", () => {
  const html = `${pageRow(11, "Asha Rao", "TESTPUR (SC)", "<span class='w3-badge'><b> 3 </b></span>", "3,09,16,833", "29,01,575")}
    <script>var _0xc75e=["hidden row"];</script>
    ${pageRow(12, "Ravi Sen", "OTHERPUR", "0", "40,14,637", "0")}
    <h3>List of Winners in Lok Sabha 2024  Bye-Elections</h3>${pageRow(13, "Bye Winner", "BYEPUR", "0", "1", "1")}`;
  assert.deepEqual(parseWinnersPage(html), [
    { candidateId: 11, name: "Asha Rao", constituency: "TESTPUR (SC)", cases: 3, assets: 30916833, liabilities: 2901575 },
    { candidateId: 12, name: "Ravi Sen", constituency: "OTHERPUR", cases: 0, assets: 4014637, liabilities: 0 },
  ]);
});

const seen = { candidateId: 11, name: "Asha Rao", constituency: "TESTPUR (SC)", cases: 0, assets: 500, liabilities: 20 };

test("fills a figure from whichever copy has it and says which", () => {
  const [fromBoth] = joinWinners([row({ assets: "500", liabilities: "20" })], [seen]);
  assert.equal(fromBoth.figuresFrom, "both");
  assert.equal(fromBoth.education, "10th Pass");
  assert.match(fromBoth.sourceUrl, /candidate_id=11$/);
  const [fromPage] = joinWinners([row({})], [seen]);
  assert.deepEqual([fromPage.assets, fromPage.liabilities, fromPage.figuresFrom], [500, 20, "winners-page"]);
  const [fromDataset] = joinWinners([row({ assets: "500", liabilities: "20" })], []);
  assert.deepEqual([fromDataset.assets, fromDataset.figuresFrom], [500, "dataset"]);
});

test("a missing figure stays missing and never becomes zero", () => {
  const [missing] = joinWinners([row({})], []);
  assert.deepEqual([missing.assets, missing.liabilities, missing.figuresFrom], [null, null, null]);
});

test("drops a figure the two copies disagree on", () => {
  const [money] = joinWinners([row({ assets: "999", liabilities: "20" })], [seen]);
  assert.deepEqual([money.assets, money.liabilities, money.figuresFrom], [null, null, null]);
  const [cases] = joinWinners([row({ criminal_cases: "2", assets: "500", liabilities: "20" })], [seen]);
  assert.equal(cases.cases, null);
});

test("keeps only 2024 winners and does not give a bye-election winner the general winner's row", () => {
  const rows = [row({ election_year: "2019" }), row({ is_winner: "False" }), row({ is_bye_election: "True" })];
  const winners = joinWinners(rows, [seen]);
  assert.equal(winners.length, 1);
  assert.equal(winners[0].byElection, true);
  assert.equal(winners[0].assets, null);
});
