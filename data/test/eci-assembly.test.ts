import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";

import {
  ARCHIVE_FILES, assemblyFiles, crossCheckAssembly, normalizeAssemblyResult, parseAssemblyDetailedResult, parseAssemblyPartyList, parseAssemblyVoters, parseAssemblyWinners, parsePartyWins,
  type AssemblyElection,
} from "../src/normalize/eci-assembly-result.js";
import { electionPartyNames } from "../src/export-assembly.js";
import { linkSegments, type SegmentRow } from "../src/normalize/eci-assembly-segments.js";

const DISCLAIMER = "This report is based on Index Cards data made available by concerned Returning Officers on the basis of Statutory data maintained in the forms. In case of any dispute, the data maintained in the Statutory Forms by the concerned Returning Officers shall prevail.";
const book = (rows: (string | number | null)[][]) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([...rows, [null], ["Disclaimer"], [DISCLAIMER]]), "Worksheet");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
};
const election: AssemblyElection = { id: "test-assembly-2023", state: "Test", seats: 2, base: "https://example.org" };

const header = ["STATE/UT NAME", "AC NO.", "AC NAME", "CANDIDATE NAME", "SEX", "AGE", "CATEGORY", "PARTY", "SYMBOL", "GENERAL", "POSTAL", "TOTAL", "% VOTES POLLED", "TOTAL ELECTORS"];
const detailedRows = () => [
  ["10 - Detailed Results"], [null], [null], header,
  ["Test", 1, "Alpha", "1 Asha", "FEMALE", 40, "GENERAL", "BJP", "Lotus", 900, 100, 1000, 60, 2000],
  ["Test", 1, "Alpha", "2 Nota", null, null, null, "NOTA", "NOTA", 50, 0, 50, 3, 2000],
  ["Test", 1, "Alpha", "3 Bina", "MALE", 50, "SC", "INC", "Hand", 600, 0, 600, 37, 2000],
  ["Test", 2, "Beta (SC)", "1 Chand", "MALE", 45, "SC", "INC", "Hand", 700, 10, 710, 70, 1500],
  ["Test", 2, "Beta (SC)", "2 Dev", "MALE", 30, "SC", "IND", "Bat", 290, 0, 290, 28, 1500],
  ["Test", 2, "Beta (SC)", "3 Nota", null, null, null, "NOTA", "NOTA", 20, 0, 20, 2, 1500],
];
const winners = book([["2 - List of Successful Candidates"], [null], ["STATE/UT"],
  ["Test", 1, "Alpha", "Asha", "F", "BJP", "Lotus", 40, "GENERAL", 1000, "BINA", "M", "INC", 600, 400],
  ["Test", 2, "Beta (SC)", "Chand", "M", "INC", "Hand", 45, "SC", 710, "DEV", "M", "IND", 290, 420]]);
const voters = book([["12 - AC Wise Voters Information"], [null], [null],
  [1, "Alpha", 1000, 1000, 0, 2000, 0, 0, 0, 0, 0, 0, 0, 1660, 0, 83, 10, 0, 50, 1600, 0],
  [2, "Beta (SC)", 800, 700, 0, 1500, 0, 0, 0, 0, 0, 0, 0, 1020, 0, 68, 0, 0, 20, 1000, 0]]);
const parties = book([["5 - Performance of Political Parties"], [null], [null], [1, "BJP", 2, 1, 0], [2, "INC", 2, 1, 0], [3, "IND", 1, 0, 1]]);
const partyList = (summary: (string | number | null)[][] = []) => book([["3 - List Of Political Parties Participated", null, null], ["PARTY TYPE", "ABBREVIATION", "PARTY"],
  ["NATIONAL PARTIES", null, null], [1, "BJP", "Bharatiya Janata Party"], [2, "INC", "Indian National Congress"],
  ["STATE PARTIES - OTHER STATES", null, null], [3, "CPI(M)", "Communist Party Of India (marxist)"],
  ["INDEPENDENTS", null, null], [4, "IND", "Independent"], [5, "NOTA", "None of the Above"], [null, null, null], ...summary]);
const listed = parseAssemblyPartyList(partyList());

test("a state assembly report is parsed, cross-checked against three other reports and normalized", () => {
  const report = parseAssemblyDetailedResult(book(detailedRows()), election);
  assert.equal(report.seats.length, 2);
  const turnout = parseAssemblyVoters(voters);
  const check = crossCheckAssembly(report, parseAssemblyWinners(winners), turnout, parsePartyWins(parties), listed);
  assert.deepEqual(check.nameVariants, []);
  const drafts = normalizeAssemblyResult(report, turnout, election, "2026-11-01T00:00:00.000Z");
  assert.equal(drafts.length, 4, "NOTA rows are not candidates");
  const asha = drafts[0].normalizedValue as Record<string, unknown>;
  assert.equal(asha.name, "Asha", "ECI's row number is removed from the name");
  assert.equal(asha.rank, 1);
  assert.equal(asha.shareOfValidVotes, 62.5);
  assert.deepEqual(asha.contest, { electors: 2000, votesPolled: 1660, validVotes: 1600, notaVotes: 50, candidates: 2 });
});

test("a 2022 winners list with seat names only is matched by name", () => {
  const report = parseAssemblyDetailedResult(book(detailedRows()), election);
  const turnout = parseAssemblyVoters(voters);
  const named = (party: string) => book([["2 - List of Successful Candidates"], ["STATE/UT", "CONSTITUENCY", "WINNER", "SEX", "PARTY", "SYMBOL"],
    ["Test", "Alpha", "Asha", "F", party, "Lotus"], ["Test", "Beta (SC)", "Chand", "M", "INC", "Hand"]]);
  const winners2022 = parseAssemblyWinners(named("BJP"));
  assert.deepEqual(winners2022.map((winner) => [winner.number, winner.seat, winner.votes]), [[null, "Alpha", null], [null, "Beta (SC)", null]]);
  assert.deepEqual(crossCheckAssembly(report, winners2022, turnout, parsePartyWins(parties), listed).nameVariants, []);
  assert.throws(() => crossCheckAssembly(report, parseAssemblyWinners(named("INC")), turnout, parsePartyWins(parties), listed), /winner differs/);
  const rows = detailedRows().map((row) => (row[2] === "Beta (SC)" ? [...row.slice(0, 2), "Alpha", ...row.slice(3)] : row));
  assert.throws(() => crossCheckAssembly(parseAssemblyDetailedResult(book(rows), election), winners2022, turnout, parsePartyWins(parties), listed), /share a name/);
});

test("an archive page gives one address per report", () => {
  const files = assemblyFiles({ id: "test-assembly-2022", state: "Test", seats: 2, archive: "https://old.eci.gov.in/files/file/1-test/" });
  assert.equal(files.detailed, "https://old.eci.gov.in/files/file/1-test/#detailed");
  assert.equal(new Set(Object.values(files)).size, 5);
  for (const name of ["10-Detailed Results (9).xlsx", "10.Detailed Results.xlsx"]) assert.match(name, ARCHIVE_FILES.detailed);
  assert.doesNotMatch("10.Detailed Results.pdf", ARCHIVE_FILES.detailed);
  for (const name of ["12 - AC Wise Voters Information.xlsx", "12.AC Wise Voters Information.xlsx"]) assert.match(name, ARCHIVE_FILES.voters);
});

test("a list of parties gives each party's name and type for that election", () => {
  assert.deepEqual(listed.map((party) => [party.abbreviation, party.type]), [
    ["BJP", "National party"], ["INC", "National party"], ["CPI(M)", "State party"], ["IND", "Independent"],
  ]);
  const summary = (count: number) => partyList([["Summary Table", null, null], ["NATIONAL PARTIES", null, count], ["STATE PARTIES - OTHER STATES", null, 1]]);
  assert.equal(parseAssemblyPartyList(summary(2)).length, 4);
  assert.throws(() => parseAssemblyPartyList(summary(3)), /differs from the summary/);
  const names = electionPartyNames(listed, new Map([
    ["CPI(M)", { name: "Communist Party of India (Marxist)", type: "National party" }], ["INC", { name: "Congress (another party)", type: "State party" }],
  ]));
  assert.deepEqual(names.get("CPI(M)"), { name: "Communist Party of India (Marxist)", type: "State party" }, "spelling from the national list, type from this election");
  assert.equal(names.get("INC")!.name, "Indian National Congress", "a different name under the same code is not borrowed");
  assert.deepEqual(electionPartyNames([], new Map()).get("IND"), { name: "Independent", type: "Independent" }, "older lists have no independents row");
});

test("the import stops when the reports disagree", () => {
  const report = parseAssemblyDetailedResult(book(detailedRows()), election);
  const turnout = parseAssemblyVoters(voters);
  const wrongParty = book([["2 - List of Successful Candidates"], [null], ["STATE/UT"],
    ["Test", 1, "Alpha", "Asha", "F", "INC", "Lotus", 40, "GENERAL", 1000, "BINA", "M", "INC", 600, 400],
    ["Test", 2, "Beta (SC)", "Chand", "M", "INC", "Hand", 45, "SC", 710, "DEV", "M", "IND", 290, 420]]);
  assert.throws(() => crossCheckAssembly(report, parseAssemblyWinners(wrongParty), turnout, parsePartyWins(parties), listed), /winner differs/);
  const wrongWins = book([["5 - Performance of Political Parties"], [null], [null], [1, "BJP", 2, 2, 0], [2, "INC", 2, 0, 0]]);
  assert.throws(() => crossCheckAssembly(report, parseAssemblyWinners(winners), turnout, parsePartyWins(wrongWins), listed), /wins in the results/);
  const unlisted = parseAssemblyPartyList(partyList()).filter((party) => party.abbreviation !== "INC");
  assert.throws(() => crossCheckAssembly(report, parseAssemblyWinners(winners), turnout, parsePartyWins(parties), unlisted), /not in the list of parties: INC/);
  const rows = detailedRows();
  rows[4] = ["Test", 1, "Alpha", "1 Asha", "FEMALE", 40, "GENERAL", "BJP", "Lotus", 900, 100, 1001, 60, 2000];
  assert.throws(() => parseAssemblyDetailedResult(book(rows), election), /do not add up/);
  assert.throws(() => parseAssemblyDetailedResult(book(detailedRows()), { ...election, seats: 3 }), /expected 3 seats/);
});

test("assembly seats are placed in Lok Sabha seats by name, reviewed spelling, or electors for repeated names", () => {
  const row = (assembly: string, parliament: string, electors: number, excelRow: number): SegmentRow => ({ excelRow, state: "Rajasthan", assembly, parliament, electors });
  const assembly = [
    { number: 33, sourceName: "Lachhmangarh", electors: 250000 },
    { number: 42, sourceName: "Shahpura", electors: 234648 },
    { number: 54, sourceName: "Malviya Nagar", electors: 216988 },
    { number: 181, sourceName: "Shahpura (SC)", electors: 252867 },
  ];
  const parliament = [
    { sourceName: "JAIPUR", slug: "jaipur", name: "Jaipur" }, { sourceName: "JAIPUR RURAL", slug: "jaipur-rural", name: "Jaipur Rural" },
    { sourceName: "BHILWARA", slug: "bhilwara", name: "Bhilwara" }, { sourceName: "SIKAR", slug: "sikar", name: "Sikar" },
  ];
  const links = linkSegments("Rajasthan", [
    row("LACHMANGARH", "SIKAR", 251000, 1), row("SHAHPURA", "BHILWARA", 254190, 2), row("MALVIYA NAGAR", "JAIPUR", 220191, 3), row("SHAHPURA", "JAIPUR RURAL", 235802, 4),
  ], assembly, parliament);
  assert.deepEqual(links.map((link) => [link.assemblyNumber, link.parliament.slug, link.rule]), [
    [33, "sikar", "alias"], [42, "jaipur-rural", "electors"], [54, "jaipur", "name"], [181, "bhilwara", "electors"],
  ]);
  assert.throws(() => linkSegments("Rajasthan", [row("NOWHERE", "JAIPUR", 1, 1), row("SHAHPURA", "BHILWARA", 254190, 2), row("MALVIYA NAGAR", "JAIPUR", 1, 3), row("SHAHPURA", "JAIPUR RURAL", 235802, 4)], assembly, parliament), /add a reviewed alias/);
  assert.throws(() => linkSegments("Rajasthan", [row("LACHMANGARH", "SIKAR", 1, 1)], assembly, parliament), /1 segments/);
});
