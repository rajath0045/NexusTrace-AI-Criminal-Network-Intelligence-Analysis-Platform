"use client";

import { useEffect, useRef } from "react";
import type { Core, ElementDefinition, StylesheetJson } from "cytoscape";
import type { GraphEntityView } from "@/domain/graph";
import { GraphEntityType, VerificationState } from "@/domain/model";
import type { SerializedGraphEdge } from "./graph-view-model";

interface NetworkCanvasProps {
  focusEntityId: string;
  nodes: GraphEntityView[];
  edges: SerializedGraphEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  fitVersion: number;
  onNodeSelect: (entityId: string) => void;
  onEdgeSelect: (relationshipId: string) => void;
}

const typeStyles: Record<GraphEntityType, { color: string; shape: string }> = {
  [GraphEntityType.Person]: { color: "#67a8ed", shape: "ellipse" },
  [GraphEntityType.Vehicle]: { color: "#a6b4c8", shape: "round-rectangle" },
  [GraphEntityType.Property]: { color: "#9ba8bb", shape: "rectangle" },
  [GraphEntityType.Phone]: { color: "#79a3a1", shape: "hexagon" },
  [GraphEntityType.Device]: { color: "#7d9cca", shape: "rectangle" },
  [GraphEntityType.BankAccount]: { color: "#baa675", shape: "barrel" },
  [GraphEntityType.Organization]: { color: "#a88ebc", shape: "round-rectangle" },
  [GraphEntityType.Location]: { color: "#8ba986", shape: "diamond" },
  [GraphEntityType.Case]: { color: "#b2a6c6", shape: "tag" },
  [GraphEntityType.Incident]: { color: "#c28b82", shape: "triangle" },
};

export function NetworkCanvas({
  focusEntityId, nodes, edges, selectedNodeId, selectedEdgeId, fitVersion, onNodeSelect, onEdgeSelect,
}: NetworkCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Core | null>(null);

  useEffect(() => {
    let cancelled = false;
    const elements: ElementDefinition[] = [
      ...nodes.map((node) => ({
        data: { id: node.id, label: node.displayLabel, entityType: node.entityType, ...typeStyles[node.entityType] },
        classes: node.id === focusEntityId ? "focus" : "",
      })),
      ...edges.map((edge) => ({
        data: { id: edge.id, source: edge.sourceId, target: edge.targetId, strength: edge.strength, verification: edge.verificationState },
        classes: `${edge.strength.toLowerCase()} ${edge.verificationState === VerificationState.Verified ? "verified" : "unverified"}`,
      })),
    ];

    void import("cytoscape").then(({ default: cytoscape }) => {
      if (cancelled || !containerRef.current) return;
      graphRef.current?.destroy();
      const graph = cytoscape({
        container: containerRef.current,
        elements,
        layout: { name: "breadthfirst", roots: [focusEntityId], directed: true, padding: 56, animate: false, spacingFactor: 1.35 },
        wheelSensitivity: 0.18,
        style: [
          { selector: "node", style: { "background-color": "data(color)", shape: "data(shape)", label: "data(label)", color: "#e7edf5", "font-size": 11, "font-weight": 600, "text-valign": "bottom", "text-margin-y": 8, width: 38, height: 38, "border-width": 1, "border-color": "#111925", "text-wrap": "ellipsis", "text-max-width": 112 } },
          { selector: "node.focus", style: { "border-width": 4, "border-color": "#d7e7fb", width: 48, height: 48 } },
          { selector: "node:selected", style: { "overlay-color": "#66a9f2", "overlay-opacity": 0.2, "overlay-padding": 9, "border-color": "#66a9f2", "border-width": 4 } },
          { selector: "edge", style: { width: 2, "line-color": "#506077", "target-arrow-color": "#506077", "target-arrow-shape": "triangle", "curve-style": "bezier", opacity: 0.82 } },
          { selector: "edge.primary", style: { width: 3, "line-color": "#78afea", "target-arrow-color": "#78afea" } },
          { selector: "edge.tertiary", style: { "line-style": "dashed", opacity: 0.62 } },
          { selector: "edge.unverified", style: { "line-style": "dotted", "target-arrow-shape": "vee" } },
          { selector: "edge:selected", style: { width: 5, "line-color": "#e2ecf9", "target-arrow-color": "#e2ecf9" } },
        ] as unknown as StylesheetJson,
      });
      graph.on("tap", "node", (event) => onNodeSelect(event.target.id()));
      graph.on("tap", "edge", (event) => onEdgeSelect(event.target.id()));
      graphRef.current = graph;
    });
    return () => { cancelled = true; graphRef.current?.destroy(); graphRef.current = null; };
  }, [edges, focusEntityId, nodes, onEdgeSelect, onNodeSelect]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.elements().unselect();
    if (selectedNodeId) graph.$id(selectedNodeId).select();
    if (selectedEdgeId) graph.$id(selectedEdgeId).select();
  }, [selectedEdgeId, selectedNodeId]);

  useEffect(() => { graphRef.current?.fit(undefined, 56); }, [fitVersion]);

  return <div ref={containerRef} className="network-canvas" aria-label="Criminal network investigation graph" role="application" />;
}
