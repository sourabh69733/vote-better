import assert from "node:assert/strict";
import test from "node:test";

import { getMpFunds, MILESTONES, summarizeFunds, type FundPublication, type FundWork } from "./mp-funds";

const work = (id: number, milestone: FundWork["milestone"], paid = 0): FundWork => ({
  id, code: null, activity: "Community hall", description: null, category: null, districtAuthority: "JAIPUR", implementingAgency: null,
  stage: null, milestone, recommended: { on: "2025-01-01", amount: 100 }, sanctioned: null, completed: null, paid, paymentPending: 0,
});

test("each work counts once, at the furthest step it reached", () => {
  const publication: FundPublication = {
    collectedAt: "2026-11-01T10:00:00.000Z",
    source: { title: "eSAKSHI", publisher: "MoSPI", url: "https://mplads.mospi.gov.in/digigov/dashboard.html" },
    members: [{ personId: "a", officialName: "A", constituency: "JAIPUR", tenure: "18th Lok Sabha", tenureStart: "2024-06-04", allocated: 1000,
      totals: { recommended: { count: 3, amount: 300 }, sanctioned: { count: 2, amount: 200 }, completed: { count: 1, amount: 90 }, payments: { count: 2, amount: 150 } },
      works: [work(1, "recommended"), work(2, "sanctioned", 50), work(3, "completed", 90)] }],
  };
  const funds = summarizeFunds(publication, "a")!;
  assert.deepEqual(funds.reached, { recommended: 1, sanctioned: 1, completed: 1 });
  assert.equal(funds.paid, 140);
  assert.equal(funds.collectedOn, "2026-11-01");
  assert.equal(summarizeFunds(publication, "b"), null);
});

test("the badges never claim a ground check", () => {
  assert.deepEqual(MILESTONES.map((step) => step.id), ["recommended", "sanctioned", "completed"]);
  assert.match(MILESTONES.find((step) => step.id === "completed")!.who, /agency/);
});

test("both Jaipur MPs have collected works", () => {
  for (const personId of ["manju-sharma", "rao-rajendra-singh"]) {
    const funds = getMpFunds(personId)!;
    assert.ok(funds.works.length > 0);
    // Every completed work was sanctioned first, so the sanctioned list holds both.
    assert.equal(funds.reached.sanctioned + funds.reached.completed, funds.totals.sanctioned.count);
    assert.equal(funds.reached.completed, funds.totals.completed.count);
  }
});
