import { describe, expect, it } from "vitest";
import { EvidenceConfidence, GraphEntityType, RelationshipStrength, VerificationState } from "@/domain/model";
import {
  buildEdgeTooltip,
  buildNodeTooltip,
  entityNodeVisual,
  graphEntityIcon,
  nodeBadgeSize,
  nodeIconSize,
  NODE_ICON_RATIO,
  parallelEdgeOffsets,
  shouldShowEdgeLabel,
  shouldShowNodeLabel,
  shouldRunLayout,
  screenSpaceNodeMetrics,
} from "./network-canvas";

describe("network marker presentation", () => {
  it("creates a concise authorized node tooltip with type, connection count, and verification", () => {
    expect(buildNodeTooltip({
      id: "person-1",
      entityType: GraphEntityType.Person,
      displayLabel: "Aditi Rao",
      verificationState: VerificationState.Verified,
      canonicalRecord: null,
    }, 4)).toEqual({
      eyebrow: "Person",
      title: "Aditi Rao",
      facts: ["4 connections", "Verified"],
    });
  });

  it("creates a compact edge tooltip without exposing provenance", () => {
    expect(buildEdgeTooltip({
      id: "edge-1", sourceId: "person-1", targetId: "device-1", relationshipType: "USES",
      strength: RelationshipStrength.Primary, evidenceConfidence: EvidenceConfidence.Probable, verificationState: VerificationState.Verified,
      interactionCount: 7, interactionSummary: null, firstObservedAt: null, latestObservedAt: null,
    })).toEqual({
      eyebrow: "Relationship",
      title: "Uses",
      facts: ["Primary strength", "Probable confidence", "7 interactions"],
    });
  });

  it("shows labels only for focus/selected markers or at a useful zoom level", () => {
    expect(shouldShowNodeLabel({ isFocus: true, isSelected: false, zoom: 0.7 })).toBe(true);
    expect(shouldShowNodeLabel({ isFocus: false, isSelected: true, zoom: 0.7 })).toBe(true);
    expect(shouldShowNodeLabel({ isFocus: false, isSelected: false, zoom: 0.6 })).toBe(false);
    expect(shouldShowNodeLabel({ isFocus: false, isSelected: false, zoom: 0.7 })).toBe(false);
    expect(shouldShowNodeLabel({ isFocus: false, isSelected: false, zoom: 0.85 })).toBe(true);
    expect(shouldShowNodeLabel({ isFocus: false, isSelected: false, zoom: 1.25 })).toBe(true);
  });

  it("keeps relationship labels semantic and selected labels available at every zoom", () => {
    expect(shouldShowEdgeLabel({ isSelected: false, zoom: 0.84 })).toBe(false);
    expect(shouldShowEdgeLabel({ isSelected: false, zoom: 0.85 })).toBe(true);
    expect(shouldShowEdgeLabel({ isSelected: true, zoom: 0.45 })).toBe(true);
  });

  it("uses distinct SVG entity icons rather than color-only graph markers", () => {
    expect(graphEntityIcon(GraphEntityType.Person)).toContain("data:image/svg+xml");
    expect(graphEntityIcon(GraphEntityType.Person)).not.toEqual(graphEntityIcon(GraphEntityType.Phone));
    expect(graphEntityIcon(GraphEntityType.Vehicle)).not.toEqual(graphEntityIcon(GraphEntityType.Property));
    expect(graphEntityIcon("UNKNOWN_ENTITY")).toContain("width%3D%2224%22");
    expect(graphEntityIcon("UNKNOWN_ENTITY")).toContain("preserveAspectRatio%3D%22xMidYMid%20meet%22");
    expect(entityNodeVisual("UNKNOWN_ENTITY").fill).toBe("#253245");
    expect(entityNodeVisual(GraphEntityType.Person).accent).toBe("#64c8ff");
    expect(graphEntityIcon(GraphEntityType.Person)).toContain("%2364c8ff");
    expect(Object.values(GraphEntityType).every((type) => graphEntityIcon(type).includes("preserveAspectRatio"))).toBe(true);
  });

  it("uses balanced circular badge sizes for focus and normal entities", () => {
    expect(nodeBadgeSize(0, true)).toBe(58);
    expect(nodeBadgeSize(1, false)).toBe(50);
    expect(nodeBadgeSize(2, false)).toBe(48);
    expect(nodeBadgeSize(3, false)).toBe(48);
  });

  it("keeps every node icon at one fixed ratio regardless of focus, selection, or semantic zoom", () => {
    const normal = nodeBadgeSize(2, false);
    const directNeighbor = nodeBadgeSize(1, false);
    const focused = nodeBadgeSize(0, true);
    expect(nodeIconSize(normal) / normal).toBe(NODE_ICON_RATIO);
    expect(nodeIconSize(directNeighbor) / directNeighbor).toBe(NODE_ICON_RATIO);
    expect(nodeIconSize(focused) / focused).toBe(NODE_ICON_RATIO);
    expect(nodeIconSize(normal)).toBe(27.84);
    expect(nodeIconSize(focused)).toBe(33.64);
  });

  it("compensates node, icon, label, border, and halo model units so badges stay fixed on screen", () => {
    const normalBadge = 48;
    const focusBadge = 58;
    for (const zoom of [0.5, 0.75, 1, 1.25, 1.5, 2]) {
      const normal = screenSpaceNodeMetrics({ zoom, badgeSize: normalBadge, isFocus: false, isSelected: false });
      const focused = screenSpaceNodeMetrics({ zoom, badgeSize: focusBadge, isFocus: true, isSelected: true });
      expect(normal.nodeSize * zoom).toBeCloseTo(48, 6);
      expect(normal.iconSize * zoom).toBeCloseTo(27.84, 6);
      expect(normal.labelFontSize * zoom).toBeCloseTo(12, 6);
      expect(normal.borderWidth * zoom).toBeCloseTo(2, 6);
      expect(focused.nodeSize * zoom).toBeCloseTo(58, 6);
      expect(focused.iconSize * zoom).toBeCloseTo(33.64, 6);
      expect(focused.labelFontSize * zoom).toBeCloseTo(12, 6);
      expect(focused.borderWidth * zoom).toBeCloseTo(3, 6);
      expect(focused.underlayPadding * zoom).toBeCloseTo(9, 6);
    }
  });

  it("reruns a layout only for explicit arrangement changes, not viewport persistence", () => {
    const initial = { algorithm: "cose" as const, hadPositions: false, autoArrangeVersion: 0 };
    expect(shouldRunLayout(null, initial)).toBe(false);
    expect(shouldRunLayout(initial, initial)).toBe(false);
    expect(shouldRunLayout(initial, { ...initial, autoArrangeVersion: 1 })).toBe(true);
    expect(shouldRunLayout(initial, { ...initial, algorithm: "circle" })).toBe(true);
    expect(shouldRunLayout(initial, { ...initial, hadPositions: true })).toBe(false);
  });

  it("separates parallel relationships with deterministic curved-route offsets", () => {
    const edge = (id: string, relationshipType: string) => ({ id, sourceId: "person", targetId: "phone", relationshipType, strength: RelationshipStrength.Secondary, evidenceConfidence: EvidenceConfidence.Probable, verificationState: VerificationState.Verified, interactionCount: 1, interactionSummary: null, firstObservedAt: null, latestObservedAt: null });
    const offsets = parallelEdgeOffsets([edge("call", "CALLED"), edge("message", "MESSAGED"), edge("transfer", "TRANSFERRED_TO")]);
    expect([...offsets.values()]).toEqual([-22, 0, 22]);
  });
});
