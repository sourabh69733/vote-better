import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";

import { parseHistoryPartyList } from "../src/normalize/eci-history-reference.js";

const list = (types: string[]) => {
  const rows = [["List of Political Parties Participated"], [null], ["Sr. No.", "PARTY TYPE", "ABBREVIATION", "PARTY SYMBOL", "PARTY NAME"],
    ...types.map((type, index) => [index + 1, type, `P${index}`, "Symbol", `Party ${index}`])];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Sheet1");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
};

test("a 2019 or 2014 party list gives party types in words", () => {
  const parties = parseHistoryPartyList(list(["N", "S", "Z", ...Array(100).fill("U")]));
  assert.deepEqual(parties.slice(0, 4).map((party) => party.type), ["National party", "State party", "Independent", "Registered (unrecognised) party"]);
  assert.throws(() => parseHistoryPartyList(list([...Array(100).fill("U"), "Q"])), /unknown party type Q/);
});
