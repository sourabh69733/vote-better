"use client";

import { useState } from "react";
import { Background, Controls, Position, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CivicGraph } from "@/lib/civic-graph";
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

  return <section className={styles.frame} aria-label="Jaipur civic relationship graph">
    <div className={styles.header}><div><strong>Area → office → person</strong><p>Select a line or use the relationship list.</p></div><button type="button" className={styles.mobileToggle} onClick={() => setMapOpen(!mapOpen)} aria-expanded={mapOpen}>{mapOpen ? "Hide map" : "Open map"}</button></div>
    <div className={styles.body}>
      <div className={`${styles.map} ${mapOpen ? styles.mapOpen : ""}`}>
        <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.18 }} minZoom={0.4} maxZoom={1.4} nodesDraggable={false} nodesConnectable={false} edgesReconnectable={false} onEdgeClick={(_, edge) => setSelectedId(edge.id)} zoomOnScroll={false} panOnScroll={false}>
          <Background color="#dce8de" gap={24} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
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
