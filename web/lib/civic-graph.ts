import { getAreaOverview } from "./civic-area";
import type { SourceRecord } from "./verified-profile";

export interface CivicGraphNode {
  id: string;
  kind: "area" | "office" | "person";
  label: string;
  detail: string;
  href?: string;
}

export interface CivicGraphEdge {
  id: string;
  from: string;
  to: string;
  label: "has seat" | "held by";
  sources: SourceRecord[];
  reviewedOn: string;
}

export interface CivicGraph {
  nodes: CivicGraphNode[];
  edges: CivicGraphEdge[];
}

export function getAreaGraph(areaId: string): CivicGraph | null {
  const overview = getAreaOverview(areaId);
  if (!overview) return null;

  const areaNode: CivicGraphNode = {
    id: `area-${overview.area.id}`,
    kind: "area",
    label: overview.area.label,
    detail: overview.area.state,
  };
  const nodes = [areaNode];
  const edges: CivicGraphEdge[] = [];

  for (const link of overview.links) {
    const officeId = `office-${link.office.id}`;
    const personId = `person-${link.person.slug}`;
    if (!nodes.some((node) => node.id === officeId)) {
      nodes.push({ id: officeId, kind: "office", label: link.office.title, detail: "Elected office" });
    }
    if (!nodes.some((node) => node.id === personId)) {
      nodes.push({ id: personId, kind: "person", label: link.person.name, detail: "Current holder in the reviewed record", href: `/people/${link.person.slug}` });
    }
    edges.push(
      { id: `${link.id}-area-office`, from: areaNode.id, to: officeId, label: "has seat", sources: link.areaSources, reviewedOn: link.reviewedOn },
      { id: `${link.id}-office-person`, from: officeId, to: personId, label: "held by", sources: link.holderSources, reviewedOn: link.reviewedOn },
    );
  }

  return { nodes, edges };
}
