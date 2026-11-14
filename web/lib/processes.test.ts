import assert from "node:assert/strict";
import test from "node:test";

import { processes } from "../records/processes";

test("every process step names who acts and links the exact page of an official source", () => {
  assert.equal(processes.length, 6);
  assert.equal(new Set(processes.map((process) => process.id)).size, processes.length);
  for (const process of processes) {
    assert.ok(process.steps.length >= 4, `${process.id}: too few steps`);
    assert.match(process.start.url, /^https:\/\/[^/]+\.(gov|nic)\.in\//, `${process.id}: start must be official`);
    for (const step of process.steps) {
      assert.ok(step.who && step.title && step.detail, `${process.id}: incomplete step`);
      assert.match(step.ref.url, /^https:\/\/[^/]+\.(gov|nic)\.in\//, `${process.id} "${step.title}": source must be official`);
      if (step.ref.url.includes(".pdf")) assert.match(step.ref.url, /#page=\d+$/, `${process.id} "${step.title}": a PDF source opens at its page`);
    }
  }
});
