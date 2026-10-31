"use client";

import { useState } from "react";
import { Background, Controls, Position, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CivicGraph, CivicGraphNode } from "@/lib/civic-graph";
import styles from "./relationship-graph.module.css";

export default function RelationshipGraph({ graph }: { graph: CivicGraph }) {
  const [selectedId, setSelectedId] = useState(graph.edges[0]?.id ?? "");
  const [mapOpen, setMapOpen] = useState(false);
  const selected = graph.edges.find((edge) => edge.id === selectedId);
  const nodes: Node[] = graph.nodes.map((node, index) => ({
    id: node.id,
    position: { x: index * 290, y: 70 },
    data: { label: <div className={styles.nodeContent}><small>{node.kind}</small><strong>{node.label}</strong><span>{node.detail}</span></div> },
    className: styles.node,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: false,
  }));
  const edges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    type: "smoothstep",
    className: edge.id === selectedId ? styles.activeEdge : styles.edge,
  }));
  const mobilePaths = graph.edges.filter((edge) => edge.label === "held by").map((edge) => {
    const areaEdge = graph.edges.find((item) => item.label === "has seat" && item.to === edge.from);
    const ids = [areaEdge?.from, edge.from, edge.to];
    return {
      id: edge.id,
      nodes: ids.map((id) => graph.nodes.find((node) => node.id === id)).filter((node): node is CivicGraphNode => Boolean(node)),
    };
  });

  return <section className={styles.frame} aria-label="Civic relationship graph">
    <div className={styles.header}><div><strong>Area → office → person</strong><p>Select a connection to see its evidence.</p></div><button type="button" className={styles.mobileToggle} onClick={() => setMapOpen(!mapOpen)} aria-controls="civic-map" aria-expanded={mapOpen}>{mapOpen ? "Hide map" : "Open map"}</button></div>
    <div className={styles.body}>
      <div id="civic-map" className={`${styles.map} ${mapOpen ? styles.mapOpen : ""}`}>
        <div className={styles.desktopFlow}>
          <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.18 }} minZoom={0.4} maxZoom={1.4} nodesDraggable={false} nodesConnectable={false} edgesReconnectable={false} onEdgeClick={(_, edge) => setSelectedId(edge.id)} zoomOnScroll={false} panOnScroll={false}>
            <Background color="#dce8de" gap={24} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        <div className={styles.mobilePath} aria-hidden="true">
          {mobilePaths.map((path) => <div key={path.id} className={styles.mobilePathGroup}>
            {path.nodes.map((node) => <div key={node.id} className={styles.mobilePathItem}>
              <small>{node.kind}</small>
              <strong>{node.label}</strong>
              <span>{node.detail}</span>
            </div>)}
          </div>)}
        </div>
      </div>
      <div className={styles.list}>
        <h2>Connections</h2>
        {graph.edges.map((edge) => {
          const from = graph.nodes.find((node) => node.id === edge.from);
          const to = graph.nodes.find((node) => node.id === edge.to);
          return <button key={edge.id} type="button" className={`${styles.row} ${edge.id === selectedId ? styles.selectedRow : ""}`} onClick={() => setSelectedId(edge.id)} aria-pressed={edge.id === selectedId}>
            <strong>{from?.label} <span>→ {edge.label} →</span> {to?.label}</strong>
            <small>Reviewed {edge.reviewedOn}</small>
          </button>;
        })}
      </div>
    </div>
    {selected && <div className={styles.evidence} aria-live="polite">
      <h2>Evidence for “{selected.label}”</h2>
      <p>These records support the link shown above. They do not establish any wider chain of command or project outcome.</p>
      <ul>{selected.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a><span>Checked {source.checkedOn}</span></li>)}</ul>
    </div>}
  </section>;
}
