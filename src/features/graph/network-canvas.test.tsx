import { describe, expect, it } from "vitest";
import { EvidenceConfidence, GraphEntityType, RelationshipStrength, VerificationState } from "@/domain/model";
import {
  buildEdgeTooltip,
  buildNodeTooltip,
  entityNodeVisual,
  graphEntityIcon,
  nodeBadgeSize,
  parallelEdgeOffsets,
  shouldShowNodeLabel,
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
    expect(shouldShowNodeLabel({ isFocus: false, isSelected: false, zoom: 0.7 })).toBe(true);
    expect(shouldShowNodeLabel({ isFocus: false, isSelected: false, zoom: 1.25 })).toBe(true);
  });

  it("uses distinct SVG entity icons rather than color-only graph markers", () => {
    expect(graphEntityIcon(GraphEntityType.Person)).toContain("data:image/svg+xml");
    expect(graphEntityIcon(GraphEntityType.Person)).not.toEqual(graphEntityIcon(GraphEntityType.Phone));
    expect(graphEntityIcon(GraphEntityType.Vehicle)).not.toEqual(graphEntityIcon(GraphEntityType.Property));
    expect(graphEntityIcon("UNKNOWN_ENTITY")).toContain("preserveAspectRatio%3D%22xMidYMid%20meet%22");
    expect(entityNodeVisual("UNKNOWN_ENTITY").fill).toBe("#253245");
    expect(Object.values(GraphEntityType).every((type) => graphEntityIcon(type).includes("preserveAspectRatio"))).toBe(true);
  });

  it("uses balanced circular badge sizes for focus and normal entities", () => {
    expect(nodeBadgeSize(0, true)).toBe(58);
    expect(nodeBadgeSize(1, false)).toBe(48);
    expect(nodeBadgeSize(2, false)).toBe(46);
    expect(nodeBadgeSize(3, false)).toBe(44);
  });

  it("separates parallel relationships with deterministic curved-route offsets", () => {
    const edge = (id: string, relationshipType: string) => ({ id, sourceId: "person", targetId: "phone", relationshipType, strength: RelationshipStrength.Secondary, evidenceConfidence: EvidenceConfidence.Probable, verificationState: VerificationState.Verified, interactionCount: 1, interactionSummary: null, firstObservedAt: null, latestObservedAt: null });
    const offsets = parallelEdgeOffsets([edge("call", "CALLED"), edge("message", "MESSAGED"), edge("transfer", "TRANSFERRED_TO")]);
    expect([...offsets.values()]).toEqual([-22, 0, 22]);
  });
});
