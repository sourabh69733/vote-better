import assert from "node:assert/strict";
import test from "node:test";

test("Jaipur graph contains only the sourced area-office-person path", async () => {
  let civicGraph: typeof import("./civic-graph");
  try {
    civicGraph = await import("./civic-graph");
  } catch {
    assert.fail("The civic relationship graph is not implemented");
  }

  const graph = civicGraph.getAreaGraph("jaipur-lok-sabha");
  assert.ok(graph);
  assert.deepEqual(graph.nodes.map((node) => node.kind), ["area", "office", "person"]);
  assert.deepEqual(graph.nodes.map((node) => node.label), ["Jaipur Lok Sabha constituency", "Member of Parliament", "Manju Sharma"]);
  assert.deepEqual(graph.edges.map((edge) => [edge.from, edge.to, edge.label]), [
    ["area-jaipur-lok-sabha", "office-lok-sabha-member", "has seat"],
    ["office-lok-sabha-member", "person-manju-sharma", "held by"],
  ]);
  assert.ok(graph.edges.every((edge) => edge.sources.length > 0));
  assert.deepEqual(graph.edges.map((edge) => edge.sources.map((source) => source.id)), [
    ["jaipur-election-2024"],
    ["jaipur-election-2024", "manju-current-members"],
  ]);
});

test("unknown area has no graph", async () => {
  let civicGraph: typeof import("./civic-graph");
  try {
    civicGraph = await import("./civic-graph");
  } catch {
    assert.fail("The civic relationship graph is not implemented");
  }

  assert.equal(civicGraph.getAreaGraph("unknown-area"), null);
});

test("Jaipur Rural graph does not inherit Jaipur's office holder", async () => {
  const { getAreaGraph } = await import("./civic-graph");
  const graph = getAreaGraph("jaipur-rural-lok-sabha");
  assert.ok(graph);
  assert.deepEqual(graph.nodes.map((node) => node.label), ["Jaipur Rural Lok Sabha constituency", "Member of Parliament", "Rao Rajendra Singh"]);
  assert.equal(graph.nodes.some((node) => node.label === "Manju Sharma"), false);
  assert.ok(graph.edges.every((edge) => edge.sources.length > 0));
});
