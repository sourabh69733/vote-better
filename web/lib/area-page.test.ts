import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import AreaPage from "../app/areas/[areaId]/page";
import { firstWithFunds } from "./mp-funds";

test("area shows the verified office holder before past election results", async () => {
  const page = await AreaPage({ params: Promise.resolve({ areaId: "jaipur-lok-sabha" }) });
  const html = renderToStaticMarkup(page);
  assert.ok(html.indexOf("Who holds office here") < html.indexOf("2024 election result"));
  assert.match(html, /View profile/);
});

test("area shows its MP's fund works and links to the full list", async () => {
  const page = await AreaPage({ params: Promise.resolve({ areaId: "jaipur-lok-sabha" }) });
  const html = renderToStaticMarkup(page);
  assert.match(html, /MP fund \(MPLADS\)/);
  assert.match(html, /href="\/people\/manju-sharma#funds"/);
});

test("people without collected fund works are skipped", () => {
  assert.equal(firstWithFunds([{ slug: "nobody" }]), null);
  assert.equal(firstWithFunds([{ slug: "nobody" }, { slug: "manju-sharma" }])?.person.slug, "manju-sharma");
});
