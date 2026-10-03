import assert from "node:assert/strict";
import test from "node:test";

test("Jaipur overview shows only the verified MP relationship with evidence", async () => {
  let civicArea: typeof import("./civic-area");
  try {
    civicArea = await import("./civic-area");
  } catch {
    assert.fail("The civic area overview is not implemented");
  }

  const overview = civicArea.getAreaOverview("jaipur-lok-sabha");
  assert.ok(overview);
  assert.equal(overview.area.name, "Jaipur");
  assert.equal(overview.area.kind, "parliamentary_constituency");
  assert.equal(overview.links.length, 1);
  assert.equal(overview.links[0].person.name, "Manju Sharma");
  assert.equal(overview.links[0].office.title, "Member of Parliament");
  assert.equal(overview.links[0].relation, "represents");
  assert.deepEqual(overview.links[0].sources.map((source) => source.id).sort(), ["current-members", "election-2024"]);
  assert.ok(overview.links[0].sources.every((source) => source.url.startsWith("https://") && source.checkedOn));
});

test("unknown area does not inherit Jaipur's representative", async () => {
  let civicArea: typeof import("./civic-area");
  try {
    civicArea = await import("./civic-area");
  } catch {
    assert.fail("The civic area overview is not implemented");
  }

  assert.equal(civicArea.getAreaOverview("unknown-area"), null);
});

test("area directory lists only registered areas", async () => {
  const { listAreaOverviews } = await import("./civic-area");
  const areas = listAreaOverviews();
  assert.deepEqual(areas.map((overview) => overview.area.id), ["jaipur-lok-sabha", "jaipur-rural-lok-sabha"]);
  assert.equal(areas[0].links.length, 1);
  assert.equal(areas[1].links.length, 1);
  assert.equal(areas[1].links[0].person.name, "Rao Rajendra Singh");
  assert.notEqual(areas[0].links[0].person.slug, areas[1].links[0].person.slug);
});
