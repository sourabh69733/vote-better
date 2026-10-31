import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";

import {
  normalizeEciGe2024DetailedResult, parseEciGe2024DetailedResult,
} from "../src/normalize/eci-ge2024-detailed-result.js";

const header = [
  "State Name", "PC Name", "Candidate Name", "Gender", "Age", "Category", "Party Name", "Party Symbol",
  "Total Votes Polled In\nThe Constituency", "Valid Votes", "General", "Postal", "Total",
  "Over Total Electors In Constituency", "Over Total Votes Polled In Constituency",
  "Over Total Valid Votes Polled In Constituency", "Total Electors",
];

type Row = (string | number | null)[];

function seat(state: string, pc: string, people: [string, string, number, number][], nota: number, extraPolled = 50): Row[] {
  const valid = people.reduce((sum, [, , general, postal]) => sum + general + postal, 0);
  const polled = valid + nota + extraPolled;
  const row = (name: string, party: string, general: number, postal: number): Row => [
    state, pc, name, name === "NOTA" ? null : "MALE", name === "NOTA" ? null : 40, name === "NOTA" ? null : "GENERAL",
    party, party === "NOTA" ? "NOTA" : "Symbol", polled, valid, general, postal, general + postal,
    1, 1, Math.round(((general + postal) / valid) * 10000) / 100, 5000,
  ];
  return [...people.map(([name, party, general, postal]) => row(name, party, general, postal)), row("NOTA", "NOTA", nota, 0)];
}

function workbook(rows: Row[], options: { header?: string[]; disclaimer?: boolean } = {}): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["33 - CONSTITUENCY WISE DETAILED RESULT"], [], options.header ?? header, ...rows, [],
    ...(options.disclaimer === false ? [] : [["Disclaimer"], ["These statistical reports are prepared only for academic and research purposes."]]),
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Worksheet");
  return XLSX.write(book, { type: "buffer", bookType: "biff8" }) as Buffer;
}

const twoSeats = [
  ...seat("Bihar", "Jahanabad", [["SURENDRA PRASAD YADAV", "RJD", 900, 10], ["CHANDESHWAR PRASAD", "JD(U)", 700, 5], ["CHANDESHWAR PRASAD", "IND", 30, 0]], 20),
  ...seat("Uttar Pradesh", "Hamirpur", [["A", "BJP", 500, 2], ["B", "SP", 400, 1]], 9),
];

test("report rows become one sourced result per candidate with rank and seat totals", () => {
  const report = parseEciGe2024DetailedResult(workbook(twoSeats), 2);
  assert.equal(report.seats, 2);
  assert.equal(report.candidates.length, 5);
  const winner = report.candidates.find((item) => item.value.name === "SURENDRA PRASAD YADAV")!;
  assert.equal(winner.value.rank, 1);
  assert.equal(winner.excelRow, 4);
  assert.deepEqual(winner.value.votes, { general: 900, postal: 10, total: 910 });
  assert.deepEqual(winner.value.contest, { electors: 5000, votesPolled: 1715, validVotes: 1645, notaVotes: 20, candidates: 3 });

  const drafts = normalizeEciGe2024DetailedResult(report, "2026-10-21T00:00:00.000Z");
  assert.equal(drafts[0].locator, "Worksheet, row 4");
  assert.equal(drafts[0].predicate, "candidate.result");
  assert.equal(drafts[0].validFrom, undefined);
});

test("namesakes in one seat get distinct person keys", () => {
  const keys = parseEciGe2024DetailedResult(workbook(twoSeats), 2).candidates.map((item) => item.personKey);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.includes("lok-sabha-2024/bihar/jahanabad/chandeshwar-prasad-jd-u"));
  assert.ok(keys.includes("lok-sabha-2024/bihar/jahanabad/chandeshwar-prasad-ind"));
  assert.ok(keys.includes("lok-sabha-2024/uttar-pradesh/hamirpur/a"));
});

test("checks reject a changed or inconsistent report", () => {
  assert.throws(() => parseEciGe2024DetailedResult(workbook(twoSeats), 3), /expected 3 seats/);
  assert.throws(() => parseEciGe2024DetailedResult(workbook(twoSeats, { header: [...header.slice(0, 16), "Electors"] }), 2), /header changed/);
  assert.throws(() => parseEciGe2024DetailedResult(workbook(twoSeats, { disclaimer: false }), 2), /disclaimer/);

  const badTotal = twoSeats.map((row) => [...row]);
  badTotal[0][12] = 911;
  assert.throws(() => parseEciGe2024DetailedResult(workbook(badTotal), 2), /do not add up/);

  const badValid = twoSeats.map((row) => [...row]);
  for (const row of badValid.slice(0, 4)) row[9] = 1;
  assert.throws(() => parseEciGe2024DetailedResult(workbook(badValid), 2), /do not match valid votes/);

  const tie = seat("Kerala", "Idukki", [["X", "INC", 100, 0], ["Y", "CPI(M)", 100, 0]], 5);
  assert.throws(() => parseEciGe2024DetailedResult(workbook(tie), 1), /tie for first place/);
});
