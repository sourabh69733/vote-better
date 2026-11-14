"use client";

import { useState } from "react";
import { Background, Controls, Position, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import styles from "./graph.module.css";

type ItemId = "place" | "ward" | "mla" | "mp" | "collector" | "commissioner" | "works";
type Item = { id: ItemId; name: string; role: string; kind: "place" | "elected" | "appointed" | "office"; note: string };
type Relation = { from: ItemId; to: ItemId; fromLabel: string; toLabel: string; meaning: string; evidence: string; kind: "representation" | "service" };

const items: Record<ItemId, Item> = {
  place: { id: "place", name: "Example Jaipur locality", role: "Sample area", kind: "place", note: "This fictional locality is the starting point. A real area match needs checked boundaries." },
  ward: { id: "ward", name: "Representative C", role: "Ward councillor", kind: "elected", note: "Represents the example ward. Local service follow-up is a separate role from delivering a service." },
  mla: { id: "mla", name: "Representative B", role: "Member of Legislative Assembly", kind: "elected", note: "Represents the example Assembly area." },
  mp: { id: "mp", name: "Representative A", role: "Member of Parliament", kind: "elected", note: "Represents the example parliamentary area." },
  collector: { id: "collector", name: "Official D", role: "District Collector", kind: "appointed", note: "Shown as a fictional district posting. An appointment is not an electoral relationship." },
  commissioner: { id: "commissioner", name: "Official E", role: "Municipal Commissioner", kind: "appointed", note: "Shown as a fictional municipal posting." },
  works: { id: "works", name: "Municipal works division", role: "Public service office", kind: "office", note: "Shown as the example office for road maintenance. A particular work needs its own record." },
};

const relations: Relation[] = [
  { from: "ward", to: "place", fromLabel: "Represents this ward", toLabel: "Represented by", meaning: "The councillor represents the fictional ward containing this locality.", evidence: "Council result and ward boundary", kind: "representation" },
  { from: "mla", to: "place", fromLabel: "Represents this Assembly area", toLabel: "Represented by", meaning: "The MLA represents the fictional Assembly area containing this locality.", evidence: "Assembly result and constituency boundary", kind: "representation" },
  { from: "mp", to: "place", fromLabel: "Represents this parliamentary area", toLabel: "Represented by", meaning: "The MP represents the fictional parliamentary area containing this locality.", evidence: "Parliamentary result and constituency boundary", kind: "representation" },
  { from: "collector", to: "place", fromLabel: "Has district jurisdiction", toLabel: "Within district jurisdiction", meaning: "The district posting is linked to the example locality through jurisdiction.", evidence: "Current appointment and district boundary", kind: "service" },
  { from: "commissioner", to: "place", fromLabel: "Has municipal jurisdiction", toLabel: "Within municipal jurisdiction", meaning: "The municipal posting is linked to the example locality through jurisdiction.", evidence: "Current appointment and municipal boundary", kind: "service" },
  { from: "works", to: "place", fromLabel: "Serves this locality", toLabel: "Served by", meaning: "The works office is shown as serving the example locality.", evidence: "Current office responsibility and service boundary", kind: "service" },
  { from: "commissioner", to: "works", fromLabel: "Oversees this office", toLabel: "Reports within municipality", meaning: "The fictional municipal commissioner oversees the example works office.", evidence: "Municipal organisation record", kind: "service" },
  { from: "ward", to: "works", fromLabel: "May follow up with", toLabel: "May receive follow-up from", meaning: "The councillor may raise a resident issue with the office. This does not mean the councillor carried out the repair.", evidence: "Dated request and office response", kind: "service" },
];

const electedIds: ItemId[] = ["ward", "mla", "mp"];
const otherIds: ItemId[] = ["collector", "commissioner", "works"];

function relationLabel(relation: Relation, focus: ItemId) {
  return relation.from === focus ? relation.fromLabel : relation.toLabel;
}

function relatedId(relation: Relation, focus: ItemId): ItemId {
  return relation.from === focus ? relation.to : relation.from;
}

function makeGraph(focus: ItemId) {
  const nearby = relations.filter((relation) => relation.from === focus || relation.to === focus);
  const nodes: Node[] = [{
    id: focus,
    position: { x: 345, y: 174 },
    data: { label: <GraphNode item={items[focus]} relation="Selected" /> },
    type: "default",
    className: `${styles.graphNode} ${styles.selectedNode}`,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: false,
    selectable: true,
  }];
  const edges: Edge[] = [];
  nearby.forEach((relation, index) => {
    const id = relatedId(relation, focus);
    const left = index < Math.ceil(nearby.length / 2);
    const sideIndex = left ? index : index - Math.ceil(nearby.length / 2);
    const sideCount = left ? Math.ceil(nearby.length / 2) : Math.floor(nearby.length / 2);
    const y = sideCount === 1 ? 174 : 22 + sideIndex * (304 / (sideCount - 1));
    nodes.push({
      id,
      position: { x: left ? 20 : 670, y },
      data: { label: <GraphNode item={items[id]} relation={relationLabel(relation, focus)} /> },
      className: styles.graphNode,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: false,
      selectable: true,
    });
    edges.push({
      id: `${focus}-${id}`,
      source: left ? id : focus,
      target: left ? focus : id,
      type: "smoothstep",
      className: relation.kind === "representation" ? styles.representationEdge : styles.serviceEdge,
      selectable: false,
    });
  });
  return { nodes, edges, nearby };
}

function GraphNode({ item, relation }: { item: Item; relation: string }) {
  return <div className={styles.nodeInner}>
    <span className={styles.nodeRelation}>{relation}</span>
    <strong>{item.name}</strong>
    <small>{item.role}</small>
  </div>;
}

export default function GraphPrototype() {
  const [focus, setFocus] = useState<ItemId>("ward");
  const [mapOpen, setMapOpen] = useState(false);
  const graph = makeGraph(focus);

  return <div className={styles.page}>
    <div className={styles.sampleBar}>Interactive design sample. Every person, office, area and relationship below is fictional.</div>
    <header className={styles.hero}>
      <div><span className={styles.kicker}>V4 · Focused relationship map</span><h1>See how one role <em>connects to your area.</em></h1><p>Select a person or office. Explore direct connections, then choose another node to go one step deeper.</p></div>
      <div className={styles.area}><span>Sample area</span><strong>Example Jaipur locality</strong><small>No real PIN or location lookup</small></div>
    </header>

    <section className={styles.chooser} aria-labelledby="choose-title">
      <div className={styles.sectionHeading}><div><span>01 · Choose a starting point</span><h2 id="choose-title">Who do you want to understand?</h2></div><p>Start with the people and offices relevant to the sample area.</p></div>
      <div className={styles.roleGroups}>
        <div><h3>Elected representatives</h3><div className={styles.roleList}>{electedIds.map((id) => <button key={id} type="button" className={`${styles.roleButton} ${focus === id ? styles.activeRole : ""}`} onClick={() => setFocus(id)} aria-pressed={focus === id}><span className={styles.monogram}>{id === "ward" ? "C" : id === "mla" ? "B" : "A"}</span><span><strong>{items[id].name}</strong><small>{items[id].role}</small></span></button>)}</div></div>
        <div><h3>Public administration</h3><div className={styles.roleList}>{otherIds.map((id) => <button key={id} type="button" className={`${styles.roleButton} ${focus === id ? styles.activeRole : ""}`} onClick={() => setFocus(id)} aria-pressed={focus === id}><span className={`${styles.monogram} ${styles.officeMonogram}`}>{id === "collector" ? "D" : id === "commissioner" ? "E" : "O"}</span><span><strong>{items[id].name}</strong><small>{items[id].role}</small></span></button>)}</div></div>
      </div>
    </section>

    <section className={styles.explorer} aria-labelledby="map-title">
      <div className={styles.sectionHeading}><div><span>02 · Direct connections</span><h2 id="map-title">{items[focus].name}</h2></div><p>{items[focus].note}</p></div>
      <div className={styles.explorerFrame}>
        <div className={styles.mapHeader}><div><strong>Relationship map</strong><span>One step from the selected role</span></div><button type="button" className={styles.mobileMapToggle} onClick={() => setMapOpen(!mapOpen)} aria-expanded={mapOpen}>{mapOpen ? "Hide map" : "Open map"}</button></div>
        <div className={`${styles.graphViewport} ${mapOpen ? styles.mapOpen : ""}`}>
          <ReactFlow key={focus} nodes={graph.nodes} edges={graph.edges} fitView fitViewOptions={{ padding: 0.14 }} minZoom={0.45} maxZoom={1.4} nodesDraggable={false} nodesConnectable={false} edgesReconnectable={false} elementsSelectable onNodeClick={(_, node) => setFocus(node.id as ItemId)} panOnScroll={false} zoomOnScroll={false} attributionPosition="bottom-left" proOptions={{ hideAttribution: false }}>
            <Background color="#dce8de" gap={26} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        <div className={styles.legend}><span><i className={styles.solidLine} /> Electoral representation</span><span><i className={styles.dashedLine} /> Public service relationship</span></div>
        <div className={styles.connections}><div className={styles.connectionHeading}><strong>Connected to {items[focus].name}</strong><small>Tap a row to follow it</small></div>
          {graph.nearby.map((relation) => {
            const id = relatedId(relation, focus);
            return <button className={styles.connectionRow} key={`${relation.from}-${relation.to}`} type="button" onClick={() => setFocus(id)}><span className={relation.kind === "representation" ? styles.representationMark : styles.serviceMark} aria-hidden="true" /><span><strong>{items[id].name}</strong><small>{relationLabel(relation, focus)} · {relation.meaning}</small><em>Would require: {relation.evidence}</em></span><span className={styles.arrow} aria-hidden="true">→</span></button>;
          })}
        </div>
      </div>
      <p className={styles.footnote}>These links demonstrate relationship types only. The real product must attach a dated original record and verified jurisdiction to each connection.</p>
    </section>
  </div>;
}
