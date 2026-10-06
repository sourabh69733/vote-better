import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import AreaPage from "../app/areas/[areaId]/page";

test("area shows the verified office holder before past election results", async () => {
  const page = await AreaPage({ params: Promise.resolve({ areaId: "jaipur-lok-sabha" }) });
  const html = renderToStaticMarkup(page);
  assert.ok(html.indexOf("Who holds office here") < html.indexOf("2024 election result"));
  assert.match(html, /View profile/);
});
