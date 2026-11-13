import assert from "node:assert/strict";
import test from "node:test";

import { everydayIssues } from "../records/everyday-issues";

test("thirty everyday problems, each with a level, an office, someone to ask and a checkable basis", () => {
  assert.equal(everydayIssues.length, 30);
  assert.equal(new Set(everydayIssues.map((issue) => issue.id)).size, everydayIssues.length, "ids are unique");
  for (const issue of everydayIssues) {
    assert.ok(issue.levels.length > 0, `${issue.id}: no level`);
    assert.ok(issue.office && issue.ask && issue.note, `${issue.id}: missing text`);
    for (const basis of issue.basis) assert.match(basis.entry, /^\d+[A-Z]?$/, `${issue.id}: entry ${basis.entry}`);
    if (issue.channel) {
      assert.match(issue.channel.url, /^https:\/\/[^/]+\.(gov|nic|org)\.in\//, `${issue.id}: channel must be an official Indian site`);
      if (issue.channel.number) assert.match(issue.channel.number, /^[\d ]{3,14}$/, `${issue.id}: number`);
      if (issue.channel.source) assert.match(issue.channel.source.url, /^https:\/\/(www\.)?pib\.gov\.in\//, `${issue.id}: source`);
    }
  }
});

test("a local-body entry is never claimed for a Union-only problem", () => {
  for (const issue of everydayIssues) {
    const local = issue.basis.some((basis) => basis.where === "Eleventh Schedule" || basis.where === "Twelfth Schedule");
    if (local) assert.ok(issue.levels.includes("local"), `${issue.id}: cites a local schedule but no local level`);
  }
});
