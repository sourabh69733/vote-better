import assert from "node:assert/strict";
import test from "node:test";

import { buildMember, feedDate, splitActivity, tenureDate, type MpladsResponses, type MpladsTarget } from "../src/mplads-works.js";

const target: MpladsTarget = { personId: "test-mp", officialName: "TEST MP", stateId: 28, constituencyId: 357, constituency: "JAIPUR" };
const who = { MP_NAME: "TEST MP", CONSTITUENCY: "JAIPUR" };
const list = (name: string, rows: object[], field: string) =>
  JSON.stringify({ [name]: JSON.stringify([...rows, { Total_Amt: rows.reduce((sum, row) => sum + (row as Record<string, number>)[field], 0) }]) });

function feed(overrides: Partial<MpladsResponses["reports"]> = {}, tiles: Record<string, unknown> = {}): MpladsResponses {
  return {
    member: JSON.stringify([{ ID: 1, CAPTION: "TEST MP" }]),
    tiles: JSON.stringify({
      "Allocated Limit for Hon'ble MPs": ["�5,00,00,000.00", "�5.00 Crore"],
      "Works Recommended": ["2", "�30,00,000.00", "�0.30 Crore"],
      "Works Sanctioned": ["1", "�10,00,000.00", "�0.10 Crore"],
      "Works Completed": ["1", "�10,00,000.00", "�0.10 Crore"],
      "Expenditure on Completed and On-going Works as on Date": ["�9,00,000.00", "�0.09 Crore"],
      "Current Tenure": [{ CAPTION: "18th Lok Sabha", ID: 7 }],
      ...tiles,
    }),
    reports: {
      allocated: list("Allocated Limit", [{ ...who, ALLOCATED_AMT: 50000000, TENURE_START_DATE: "Jun 4, 2024 12:00:00 AM" }], "ALLOCATED_AMT"),
      recommended: list("Total Works Recommended", [
        { ...who, CONSTITUENCY_ID: 357, WORK_RECOMMENDATION_DTL_ID: 11, ACTIVITY_NAME: "WS/MP1/2024-2025/11-1.5 Construction of community halls",
          WORK_DESCRIPTION: "Hall in ward 5", RECOMMENDATION_DATE: "01-Jul-2024", RECOMMENDED_AMOUNT: 1000000,
          SANCTION_DATE: "01-Aug-2024", SANCTION_AMOUNT: 1000000, WORK_STAGE: "Physical Inspection", IDA_NAME: "JAIPUR" },
        { ...who, CONSTITUENCY_ID: 357, WORK_RECOMMENDATION_DTL_ID: 12, ACTIVITY_NAME: "NA-2.1 Drinking water",
          WORK_DESCRIPTION: "?????? ????", RECOMMENDATION_DATE: "02-Sep-2025", RECOMMENDED_AMOUNT: 2000000,
          SANCTION_DATE: "NA", WORK_STAGE: "Pending for Sanction", IDA_NAME: "JAIPUR" },
      ], "RECOMMENDED_AMOUNT"),
      sanctioned: list("Total Sanction Work", [
        { ...who, CONSTITUENCY_ID: 357, WORK_RECOMMENDATION_DTL_ID: 11, ACTIVITY_NAME: "WS/MP1/2024-2025/11-1.5 Construction of community halls",
          SANCTION_DATE: "01-Aug-2024", SANCTION_AMOUNT: 1000000, WORK_STAGE: "Physical Inspection", IDA_NAME: "JAIPUR" },
      ], "SANCTION_AMOUNT"),
      completed: list("Total Works Completed", [
        { ...who, CONSTITUENCY_ID: 357, WORK_RECOMMENDATION_DTL_ID: 11, ACTIVITY_NAME: "WS/MP1/2024-2025/11-1.5 Construction of community halls",
          ACTUAL_END_DATE: "15-Jan-2025", ACTUAL_AMOUNT: 950000, IDA_NAME: "JAIPUR" },
      ], "ACTUAL_AMOUNT"),
      payments: list("Total Expenditure", [
        { ...who, WORK_RECOMMENDATION_DTL_ID: 11, FUND_DISBURSED_AMT: 600000, WORK_STATUS: "Payment Success", IA_NAME: "PWD" },
        { ...who, WORK_RECOMMENDATION_DTL_ID: 11, FUND_DISBURSED_AMT: 300000, WORK_STATUS: "Payment In-Progress", IA_NAME: "PWD" },
      ], "FUND_DISBURSED_AMT"),
      ...overrides,
    },
  };
}

test("feed dates and activity names are read into plain values", () => {
  assert.equal(feedDate("28-Apr-2025"), "2025-04-28");
  assert.throws(() => feedDate("31-Feb-2025"), /Invalid date/);
  assert.equal(tenureDate("Jun 4, 2024 12:00:00 AM"), "2024-06-04");
  assert.deepEqual(splitActivity("WS/MP18165/2024-2025/147543-8.5 Purchase of hospital equipment"),
    { code: "WS/MP18165/2024-2025/147543", activity: "Purchase of hospital equipment" });
  assert.deepEqual(splitActivity("NA-1.5 Construction of community halls"), { code: null, activity: "Construction of community halls" });
});

test("the lists join into one record per work, with its furthest milestone", () => {
  const member = buildMember(target, feed());
  assert.equal(member.tenureStart, "2024-06-04");
  assert.deepEqual(member.totals.recommended, { count: 2, amount: 3000000 });
  const [pending, done] = member.works;
  assert.equal(pending.milestone, "recommended");
  assert.equal(pending.sanctioned, null);
  assert.equal(pending.description, null, "a garbled Hindi description is dropped, not shown as question marks");
  assert.deepEqual(done, {
    id: 11, code: "WS/MP1/2024-2025/11", activity: "Construction of community halls", description: "Hall in ward 5",
    category: null, districtAuthority: "JAIPUR", implementingAgency: "PWD", stage: "Physical Inspection", milestone: "completed",
    recommended: { on: "2024-07-01", amount: 1000000 }, sanctioned: { on: "2024-08-01", amount: 1000000 },
    completed: { on: "2025-01-15", amount: 950000 }, paid: 600000, paymentPending: 300000,
  });
});

test("a list that disagrees with its tile, its total or its MP is refused", () => {
  assert.throws(() => buildMember(target, feed({}, { "Works Sanctioned": ["2", "�10,00,000.00"] })), /tile says 2, list has 1/);
  const broken = JSON.parse(feed().reports.completed);
  broken["Total Works Completed"] = broken["Total Works Completed"].replace('"Total_Amt":950000', '"Total_Amt":1');
  assert.throws(() => buildMember(target, feed({ completed: JSON.stringify(broken) })), /rows add to 950000/);
  assert.throws(() => buildMember({ ...target, officialName: "OTHER MP" }, feed()), /expected OTHER MP/);
});
