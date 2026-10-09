import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeGnctd } from "../src/delhi/normalize/gnctd.js";
import { normalizeAssembly } from "../src/delhi/normalize/assembly.js";
import { normalizePolice } from "../src/delhi/normalize/police.js";

const at = "2026-10-09T00:00:00.000Z";

test("GNCTD row keeps role and office contact, and leaves namesakes separate", () => {
  const html = `<table class="views-table"><thead><tr><th>Name</th><th>Department</th><th>Designation</th><th>Email ID</th><th>Office No.</th></tr></thead><tbody>
    <tr><td headers="view-counter-table-column">1</td><td headers="view-title-table-column">Sh. Ravi Kumar</td><td headers="view-field-department-table-column">Services-I</td><td headers="view-field-personnel-designation-table-column">Section Officer</td><td headers="view-field-email-id-table-column">office[at]nic[dot]in</td><td headers="view-field-office-no-table-column">011-12345678</td><td headers="view-field-extension-no-table-column"></td></tr>
    <tr><td headers="view-counter-table-column">2</td><td headers="view-title-table-column">Sh. Ravi Kumar</td><td headers="view-field-department-table-column">Services-II</td><td headers="view-field-personnel-designation-table-column">Section Officer</td><td headers="view-field-email-id-table-column"></td><td headers="view-field-office-no-table-column"></td><td headers="view-field-extension-no-table-column"></td></tr></tbody></table>`;
  const rows = normalizeGnctd(html, at);
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].locator, rows[1].locator);
  assert.deepEqual(rows[0].normalizedValue, { name: "Sh. Ravi Kumar", department: "Services-I", role: "Section Officer", officeEmail: "office@nic.in", officePhone: "011-12345678" });
  assert.throws(() => normalizeGnctd("<table></table>", at), /layout/i);
});

test("Assembly parser excludes residence and personal phone columns", () => {
  const html = `<table><thead><tr><td>NAME &amp; DESIGNATION</td><td>OFFICE</td><td>RES.</td><td>RESIDENTIAL ADD.</td></tr></thead><tbody><tr><td>1.</td><td><strong>Shri Vijender Gupta</strong><br>Hon'ble Speaker</td><td>23890140</td><td>9999999999</td><td>Private address</td></tr></tbody></table>`;
  const rows = normalizeAssembly(html, at);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].normalizedValue, { name: "Shri Vijender Gupta", role: "Hon'ble Speaker", officePhone: "23890140" });
  assert.ok(!JSON.stringify(rows).includes("Private address"));
  assert.ok(!JSON.stringify(rows).includes("9999999999"));
});

test("Police parser marks a helpline as a helpline, not a mapped station", () => {
  const html = `<table id="MainContent_grddata"><tr><th>Office/Police Station</th><th>Telephone No.</th><th>District/Unit</th></tr><tr><td>1</td><td>Missing Persons</td><td>1094</td><td></td><td></td><td>HELPLINE</td><td></td></tr></table>`;
  const rows = normalizePolice(html, at);
  assert.deepEqual(rows[0].normalizedValue, { office: "Missing Persons", officePhone: "1094", unit: "HELPLINE" });
  assert.throws(() => normalizePolice("<table></table>", at), /layout/i);
});
