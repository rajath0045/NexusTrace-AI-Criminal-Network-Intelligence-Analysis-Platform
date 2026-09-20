"use client";

import { useEffect, useRef, useState } from "react";
import type { Core, ElementDefinition, NodeSingular, StylesheetJson } from "cytoscape";
import type { GraphEntityView } from "@/domain/graph";
import { GraphEntityType, VerificationState } from "@/domain/model";
import type { SerializedGraphEdge } from "./graph-view-model";
import type { GraphPresentation } from "@/domain/graph-layout";

interface NetworkCanvasProps {
  focusEntityId: string;
  nodes: GraphEntityView[];
  edges: SerializedGraphEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  focusMode: boolean;
  fitVersion: number;
  recenterVersion: number;
  presentation: GraphPresentation;
  customizeMode: boolean;
  onPresentationChange: (update: Pick<GraphPresentation, "positions" | "edgeRoutes" | "zoom" | "pan">) => void;
  onNodeSelect: (entityId: string) => void;
  onEdgeSelect: (relationshipId: string) => void;
}

interface TooltipContent {
  eyebrow: string;
  title: string;
  facts: string[];
}

interface HoverTooltip {
  content: TooltipContent;
  x: number;
  y: number;
}

const iconPaths: Record<GraphEntityType, string> = {
  [GraphEntityType.Person]: '<circle cx="12" cy="8" r="3.2"/><path d="M5.8 20c.7-3.8 3-5.8 6.2-5.8s5.5 2 6.2 5.8"/>',
  [GraphEntityType.Vehicle]: '<path d="M4 15.5h16l-1.4-5H5.4z"/><path d="M6 15.5v2.2M18 15.5v2.2"/><circle cx="7.3" cy="17.5" r="1.2"/><circle cx="16.7" cy="17.5" r="1.2"/>',
  [GraphEntityType.Property]: '<path d="m4.5 10 7.5-6 7.5 6v9.5H4.5z"/><path d="M9.2 19.5v-5h5.6v5"/>',
  [GraphEntityType.Phone]: '<rect x="7.5" y="3.5" width="9" height="17" rx="1.6"/><path d="M10.2 6h3.6M11.2 17.7h1.6"/>',
  [GraphEntityType.Device]: '<rect x="4.5" y="5" width="15" height="11" rx="1.4"/><path d="M9 20h6M12 16v4"/>',
  [GraphEntityType.BankAccount]: '<path d="m3.5 9 8.5-5 8.5 5zM5.5 10.5h13M6.8 10.5v6M10.3 10.5v6M13.7 10.5v6M17.2 10.5v6M4.5 19.5h15"/>',
  [GraphEntityType.Organization]: '<path d="M5 20V5.5h10v14.5M15 10h4v10M8 8h1.5M11 8h1.5M8 11.5h1.5M11 11.5h1.5M8 15h1.5M11 15h1.5"/>',
  [GraphEntityType.Location]: '<path d="M18.3 10.2c0 4.6-6.3 9.8-6.3 9.8s-6.3-5.2-6.3-9.8a6.3 6.3 0 1 1 12.6 0Z"/><circle cx="12" cy="10.2" r="2.1"/>',
  [GraphEntityType.Case]: '<path d="M3.8 7.5h6l1.6 2H20v10.2H3.8z"/><path d="M3.8 7.5V5.2h6.4"/>',
  [GraphEntityType.Incident]: '<path d="m12 3 9 17H3z"/><path d="M12 9v4.5M12 17h.01"/>',
};

const markerColors: Record<GraphEntityType, string> = {
  [GraphEntityType.Person]: "#4f9fe8", [GraphEntityType.Vehicle]: "#527ba6", [GraphEntityType.Property]: "#4e7197", [GraphEntityType.Phone]: "#4d8ba1", [GraphEntityType.Device]: "#577fb4", [GraphEntityType.BankAccount]: "#367f93", [GraphEntityType.Organization]: "#3d89ac", [GraphEntityType.Location]: "#527da8", [GraphEntityType.Case]: "#386aa5", [GraphEntityType.Incident]: "#ba7655",
};

function titleCase(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function markerIcon(type: GraphEntityType): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#eaf3ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[type]}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function buildNodeTooltip(node: GraphEntityView, connectionCount: number): TooltipContent {
  return { eyebrow: titleCase(node.entityType), title: node.displayLabel, facts: [`${connectionCount} connection${connectionCount === 1 ? "" : "s"}`, titleCase(node.verificationState)] };
}

export function buildEdgeTooltip(edge: SerializedGraphEdge): TooltipContent {
  return { eyebrow: "Relationship", title: titleCase(edge.relationshipType), facts: [`${titleCase(edge.strength)} strength`, `${titleCase(edge.evidenceConfidence)} confidence`, `${edge.interactionCount} interaction${edge.interactionCount === 1 ? "" : "s"}`] };
}

export function shouldShowNodeLabel({ isFocus, isSelected, zoom }: { isFocus: boolean; isSelected: boolean; zoom: number }): boolean {
  return isFocus || isSelected || zoom >= 1.15;
}

function depthsFromFocus(nodes: GraphEntityView[], edges: SerializedGraphEdge[], focusEntityId: string): Map<string, number> {
  const neighbors = new Map(nodes.map((node) => [node.id, new Set<string>()]));
  for (const edge of edges) { neighbors.get(edge.sourceId)?.add(edge.targetId); neighbors.get(edge.targetId)?.add(edge.sourceId); }
  const depths = new Map<string, number>([[focusEntityId, 0]]);
  const queue = [focusEntityId];
  while (queue.length) {
    const current = queue.shift()!;
    const depth = depths.get(current)!;
    for (const neighbor of neighbors.get(current) ?? []) if (!depths.has(neighbor)) { depths.set(neighbor, depth + 1); queue.push(neighbor); }
  }
  return depths;
}

function markerSize(depth: number | undefined, isFocus: boolean): number {
  if (isFocus) return 50;
  if (depth === 1) return 39;
  if (depth === 2) return 33;
  return 28;
}

function verificationClass(state: VerificationState): string { return state.toLowerCase().replaceAll("_", "-"); }

function clampTooltip(container: HTMLDivElement, x: number, y: number): Pick<HoverTooltip, "x" | "y"> {
  return { x: Math.max(10, Math.min(x + 14, container.clientWidth - 210)), y: Math.max(34, Math.min(y, container.clientHeight - 34)) };
}

function updateSemanticLabels(graph: Core, focusEntityId: string, selectedNodeId: string | null): void {
  const zoom = graph.zoom();
  graph.nodes().forEach((node) => {
    node.toggleClass("show-marker-label", shouldShowNodeLabel({ isFocus: node.id() === focusEntityId, isSelected: node.id() === selectedNodeId, zoom }));
  });
}

function updateFocusMode(graph: Core, selectedNodeId: string | null, enabled: boolean): void {
  graph.elements().removeClass("focus-dim neighborhood-0 neighborhood-1 neighborhood-2 neighborhood-3 neighborhood-edge");
  if (!enabled || !selectedNodeId) return;
  const selected = graph.$id(selectedNodeId);
  if (selected.empty()) return;
  const selectedNode = selected.nodes()[0];
  if (!selectedNode) return;
  const depths = new Map<string, number>([[selectedNodeId, 0]]);
  let frontier: NodeSingular[] = [selectedNode];
  for (let level = 1; level <= 3; level += 1) {
    const next: typeof frontier = [];
    for (const node of frontier) node.connectedEdges().forEach((edge) => {
      const neighbor = edge.source().id() === node.id() ? edge.target() : edge.source();
      if (!depths.has(neighbor.id())) { depths.set(neighbor.id(), level); next.push(neighbor); }
    });
    frontier = next;
  }
  graph.elements().addClass("focus-dim");
  depths.forEach((depth, id) => graph.$id(id).removeClass("focus-dim").addClass(`neighborhood-${depth}`));
  graph.edges().forEach((edge) => { if (depths.has(edge.source().id()) && depths.has(edge.target().id())) edge.removeClass("focus-dim").addClass("neighborhood-edge"); });
}

export function NetworkCanvas({ focusEntityId, nodes, edges, selectedNodeId, selectedEdgeId, focusMode, fitVersion, recenterVersion, presentation, customizeMode, onPresentationChange, onNodeSelect, onEdgeSelect }: NetworkCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Core | null>(null);
  const selectedNodeIdRef = useRef(selectedNodeId);
  const [tooltip, setTooltip] = useState<HoverTooltip | null>(null);

  useEffect(() => { selectedNodeIdRef.current = selectedNodeId; }, [selectedNodeId]);

  useEffect(() => {
    let cancelled = false;
    const depths = depthsFromFocus(nodes, edges, focusEntityId);
    const pairOffsets = new Map<string, number>();
    const groupedEdges = new Map<string, SerializedGraphEdge[]>();
    for (const edge of edges) {
      const key = [edge.sourceId, edge.targetId].sort().join(":");
      groupedEdges.set(key, [...(groupedEdges.get(key) ?? []), edge]);
    }
    for (const group of groupedEdges.values()) {
      group.forEach((edge, index) => pairOffsets.set(edge.id, (index - (group.length - 1) / 2) * 22));
    }
    const elements: ElementDefinition[] = [
      ...nodes.map((node) => ({ data: { id: node.id, label: node.displayLabel, color: markerColors[node.entityType], icon: markerIcon(node.entityType), size: markerSize(depths.get(node.id), node.id === focusEntityId) }, position: presentation.positions[node.id], classes: node.id === focusEntityId ? "focus-marker" : "" })),
      ...edges.map((edge) => ({ data: {
        id: edge.id, source: edge.sourceId, target: edge.targetId,
        label: titleCase(edge.relationshipType),
        routeOffset: Object.hasOwn(presentation.edgeRoutes, edge.id) ? presentation.edgeRoutes[edge.id]! : pairOffsets.get(edge.id) ?? 0,
      }, classes: `${edge.strength.toLowerCase()} ${verificationClass(edge.verificationState)}` })),
    ];
    void import("cytoscape").then(({ default: cytoscape }) => {
      if (cancelled || !containerRef.current) return;
      graphRef.current?.destroy();
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const graph = cytoscape({
        container: containerRef.current, elements,
        layout: Object.keys(presentation.positions).length > 0
          ? { name: "preset", fit: true, padding: 84 }
          : { name: presentation.algorithm, roots: [focusEntityId], directed: true, padding: 84, animate: false, spacingFactor: 1.75, avoidOverlap: true },
        minZoom: 0.45, maxZoom: 2.4, wheelSensitivity: 0.16, autoungrabify: !customizeMode,
        style: [
          { selector: "node", style: { "background-color": "data(color)", "background-image": "data(icon)", "background-fit": "contain", "background-width": "54%", "background-height": "54%", width: "data(size)", height: "data(size)", label: "", color: "#eaf3ff", "font-size": 10, "font-weight": 650, "text-valign": "bottom", "text-margin-y": 9, "text-wrap": "ellipsis", "text-max-width": 116, "border-width": 2, "border-color": "#bedafa", "overlay-opacity": 0, "underlay-color": "#3e91e9", "underlay-opacity": 0, "underlay-padding": 5 } },
          { selector: "node.show-marker-label", style: { label: "data(label)" } },
          { selector: "node.focus-marker", style: { "border-width": 3, "border-color": "#e9f4ff", "underlay-opacity": 0.34, "underlay-padding": 10 } },
          { selector: "node.marker-selected", style: { "border-width": 4, "border-color": "#7fc1ff", "underlay-opacity": 0.52, "underlay-padding": 12 } },
          { selector: "node.hovered-marker", style: { "border-width": 3, "border-color": "#d5ecff", "underlay-opacity": 0.28, "underlay-padding": 8 } },
          { selector: "node.edge-endpoint", style: { "border-color": "#cce8ff", "underlay-opacity": 0.26, "underlay-padding": 7 } },
          { selector: "node.focus-dim", style: { opacity: 0.27 } }, { selector: "node.neighborhood-0", style: { opacity: 1 } }, { selector: "node.neighborhood-1", style: { opacity: 0.92 } }, { selector: "node.neighborhood-2", style: { opacity: 0.64 } }, { selector: "node.neighborhood-3", style: { opacity: 0.42 } },
          { selector: "edge", style: { width: 1.5, "line-color": "#536b87", "target-arrow-color": "#536b87", "target-arrow-shape": "triangle", "arrow-scale": 0.7, "curve-style": "unbundled-bezier", "control-point-distances": "data(routeOffset)", "control-point-weights": 0.5, label: "data(label)", color: "#bcd0e6", "font-size": 8, "font-weight": 650, "text-rotation": "autorotate", "text-background-color": "#08101b", "text-background-opacity": 0.86, "text-background-padding": 2, "text-background-shape": "roundrectangle", opacity: 0.72 } },
          { selector: "edge.primary", style: { width: 3.2, "line-color": "#ff365e", "target-arrow-color": "#ff365e", opacity: 0.96 } }, { selector: "edge.secondary", style: { width: 2.1, "line-color": "#2f9bff", "target-arrow-color": "#2f9bff", opacity: 0.82 } }, { selector: "edge.tertiary", style: { width: 1.7, "line-color": "#f5db45", "target-arrow-color": "#f5db45", opacity: 0.72 } },
          { selector: "edge.pending", style: { "line-style": "dashed", opacity: 0.58 } }, { selector: "edge.changes-requested", style: { "line-style": "dashed", opacity: 0.48 } }, { selector: "edge.rejected", style: { "line-style": "dotted", opacity: 0.32 } }, { selector: "edge.focus-dim", style: { opacity: 0.16 } }, { selector: "edge.neighborhood-edge", style: { opacity: 0.84 } }, { selector: "edge.marker-selected", style: { width: 4.6, "line-color": "#d8ebff", "target-arrow-color": "#d8ebff", opacity: 1 } },
          { selector: "node.hover-dim", style: { opacity: 0.3 } }, { selector: "edge.hover-dim", style: { opacity: 0.14 } }, { selector: "edge.hovered-connection", style: { width: 4, "line-color": "#d8ebff", "target-arrow-color": "#d8ebff", opacity: 1 } },
        ] as unknown as StylesheetJson,
      });
      const position = (event: { renderedPosition: { x: number; y: number } }) => clampTooltip(containerRef.current!, event.renderedPosition.x, event.renderedPosition.y);
      graph.on("mouseover mousemove", "node", (event) => {
        event.target.addClass("hovered-marker");
        const entity = nodes.find((node) => node.id === event.target.id());
        if (entity) setTooltip({ content: buildNodeTooltip(entity, event.target.connectedEdges().length), ...position(event) });
      });
      graph.on("mouseover mousemove", "edge", (event) => {
        graph.elements().addClass("hover-dim");
        event.target.removeClass("hover-dim").addClass("hovered-connection");
        event.target.source().removeClass("hover-dim").addClass("edge-endpoint");
        event.target.target().removeClass("hover-dim").addClass("edge-endpoint");
        const edge = edges.find((item) => item.id === event.target.id());
        if (edge) setTooltip({ content: buildEdgeTooltip(edge), ...position(event) });
      });
      graph.on("mouseout", "node", (event) => { event.target.removeClass("hovered-marker"); setTooltip(null); });
      graph.on("mouseout", "edge", (event) => { graph.elements().removeClass("hover-dim hovered-connection"); event.target.source().removeClass("edge-endpoint"); event.target.target().removeClass("edge-endpoint"); setTooltip(null); });
      graph.on("tap", "node", (event) => onNodeSelect(event.target.id()));
      graph.on("tap", "edge", (event) => onEdgeSelect(event.target.id()));
      if (customizeMode) graph.nodes().grabify(); else graph.nodes().ungrabify();
      graph.on("dragfree", "node", () => {
        if (!customizeMode) return;
        const positions = Object.fromEntries(graph.nodes().map((node) => [node.id(), node.position()]));
        onPresentationChange({ positions, edgeRoutes: presentation.edgeRoutes, zoom: graph.zoom(), pan: graph.pan() });
      });
      graph.on("zoom", () => updateSemanticLabels(graph, focusEntityId, selectedNodeIdRef.current));
      graphRef.current = graph;
      updateSemanticLabels(graph, focusEntityId, selectedNodeIdRef.current);
      if (!reducedMotion) graph.animate({ fit: { eles: graph.elements(), padding: 64 } }, { duration: 150 });
    });
    return () => { cancelled = true; graphRef.current?.destroy(); graphRef.current = null; };
  }, [customizeMode, edges, focusEntityId, nodes, onEdgeSelect, onNodeSelect, onPresentationChange, presentation]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.elements().removeClass("marker-selected edge-endpoint").unselect();
    if (selectedNodeId) graph.$id(selectedNodeId).addClass("marker-selected").select();
    if (selectedEdgeId) { const edge = graph.$id(selectedEdgeId).addClass("marker-selected").select(); edge.source().addClass("edge-endpoint"); edge.target().addClass("edge-endpoint"); }
    updateSemanticLabels(graph, focusEntityId, selectedNodeId);
    updateFocusMode(graph, selectedNodeId, focusMode);
  }, [focusEntityId, focusMode, selectedEdgeId, selectedNodeId]);

  useEffect(() => { graphRef.current?.fit(undefined, 64); }, [fitVersion]);
  useEffect(() => {
    const nodes = graphRef.current?.nodes();
    if (!nodes) return;
    if (customizeMode) nodes.grabify(); else nodes.ungrabify();
  }, [customizeMode]);
  useEffect(() => {
    const graph = graphRef.current;
    const focus = graph?.$id(focusEntityId);
    if (!graph || !focus || focus.empty()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) graph.center(focus);
    else graph.animate({ center: { eles: focus } }, { duration: 180 });
  }, [focusEntityId, recenterVersion]);

  return <div ref={containerRef} className="network-canvas" aria-label="Criminal network investigation graph" role="application">{tooltip ? <div className="network-graph-tooltip" role="tooltip" style={{ left: tooltip.x, top: tooltip.y }}><span>{tooltip.content.eyebrow}</span><strong>{tooltip.content.title}</strong><small>{tooltip.content.facts.join(" · ")}</small></div> : null}</div>;
}
