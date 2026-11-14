import assert from "node:assert/strict";
import test from "node:test";
import { formatTermDuration } from "./term-duration";

test("office duration counts complete calendar months through the review date", () => {
  assert.equal(formatTermDuration("2024-06-04", "2026-10-02"), "2 years, 3 months");
  assert.equal(formatTermDuration("2024-06-04", "2024-07-04"), "1 month");
  assert.equal(formatTermDuration("2024-06-04", "2024-06-20"), "Less than a month");
});
