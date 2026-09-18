import type {
  GraphEdgeView,
  GraphEntityView,
  GraphFilters,
  GraphNeighborhood,
  GraphSource,
  RelationshipDetail,
} from "@/domain/graph";

export interface SerializedGraphEdge extends Omit<GraphEdgeView, "firstObservedAt" | "latestObservedAt"> {
  firstObservedAt: string | null;
  latestObservedAt: string | null;
}

export type SerializedGraphSource = GraphSource;

export interface SerializedGraphNeighborhood {
  focusEntity: GraphEntityView;
  nodes: GraphEntityView[];
  edges: SerializedGraphEdge[];
  activeFilters: GraphFilters;
  provenanceSummaries: GraphNeighborhood["provenanceSummaries"];
}

export interface SerializedRelationshipDetail extends SerializedGraphEdge {
  sourceEntity: GraphEntityView;
  targetEntity: GraphEntityView;
  departmentName: string;
  createdByName: string;
  verifiedByName: string | null;
  verifiedAt: string | null;
  provenance: SerializedGraphSource[];
}

function dateValue(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function edgeView(edge: GraphEdgeView): SerializedGraphEdge {
  return { ...edge, firstObservedAt: dateValue(edge.firstObservedAt), latestObservedAt: dateValue(edge.latestObservedAt) };
}

export function serializeGraphNeighborhood(graph: GraphNeighborhood): SerializedGraphNeighborhood {
  return {
    ...graph,
    edges: graph.edges.map(edgeView),
  };
}

export function serializeRelationshipDetail(detail: RelationshipDetail): SerializedRelationshipDetail {
  return {
    ...edgeView(detail),
    sourceEntity: detail.sourceEntity,
    targetEntity: detail.targetEntity,
    departmentName: detail.departmentName,
    createdByName: detail.createdByName,
    verifiedByName: detail.verifiedByName,
    verifiedAt: dateValue(detail.verifiedAt),
    provenance: detail.provenance,
  };
}
