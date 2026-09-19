import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GraphEntityType, IncidentVerificationLevel, LocationObservationType, LocationSourceRecordType, VerificationState } from "@/domain/model";
import type { SerializedGeographicProjection } from "./geographic-view-model";
import { GeographicNetworkMap } from "./geographic-network-map";

vi.mock("@/components/ui/mapcn-marker-tooltip", () => ({
  Map: ({ children, onError, onLifecycleChange }: { children: React.ReactNode; onError: (error: Error) => void; onLifecycleChange: (status: string) => void }) => <div aria-label="Mock map"><button type="button" onClick={() => onError(new Error("external tile failure"))}>Trigger map failure</button><button type="button" onClick={() => onLifecycleChange("DELAYED")}>Trigger map delay</button>{children}</div>,
  MapMarker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MarkerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MarkerLabel: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  MarkerTooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({ map: null, isLoaded: false, status: "INITIALIZING" }),
}));

const entity = { id: "person", entityType: GraphEntityType.Person, displayLabel: "Arjun Mehta", verificationState: VerificationState.Verified, canonicalRecord: { type: "PERSON" as const, id: "person-record" } };
const observation = { id: "observation", graphEntityId: entity.id, entityType: GraphEntityType.Person, entityLabel: entity.displayLabel, latitude: 12.97, longitude: 77.64, observedAt: "2026-08-16T20:44:00.000Z", observationType: LocationObservationType.ObservedPersonLocation, locationLabel: "Location X", context: null, accuracyMeters: 40, sourceRecordType: LocationSourceRecordType.Evidence, sourceRecordId: "source", sourceEvidenceId: "evidence", verificationLevel: IncidentVerificationLevel.DepartmentVerified };
const projection: SerializedGeographicProjection = { focusEntity: entity, graph: { focusEntity: entity, nodes: [entity], edges: [], activeFilters: { hops: 1, strengths: [], verificationStates: [] }, provenanceSummaries: [] }, observations: [observation], connections: [], activities: [], timeline: [], findings: [], summary: { communicationCount: 0, financialCount: 0, verifiedObservationCount: 1, relatedCaseCount: 0, evidenceCount: 1, unknownEndpointCount: 0 }, generatedAt: "2026-09-19T00:00:00.000Z" };

function renderMap(overrides: Partial<React.ComponentProps<typeof GeographicNetworkMap>> = {}) {
  const onSwitchToRelationship = vi.fn();
  render(<GeographicNetworkMap projection={projection} selectedEntityId={entity.id} selectedConnectionId={null} visibleEntityTypes={[GraphEntityType.Person]} showNetwork showObservations heatmap={false} fitVersion={0} recenterVersion={0} onEntitySelect={vi.fn()} onConnectionSelect={vi.fn()} onSwitchToRelationship={onSwitchToRelationship} {...overrides} />);
  return { onSwitchToRelationship };
}

describe("GeographicNetworkMap failure states", () => {
  it("offers retry and relationship-view recovery when map tiles fail", async () => {
    const user = userEvent.setup();
    const { onSwitchToRelationship } = renderMap();
    await user.click(screen.getByRole("button", { name: "Trigger map failure" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Map tiles could not be loaded.");
    await user.click(screen.getByRole("button", { name: "Switch to Relationship View" }));
    expect(onSwitchToRelationship).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Retry Map" }));
    expect(screen.getByLabelText("Mock map")).toBeVisible();
  });

  it("explains when the investigation has no authorized geographic observations", () => {
    renderMap({ projection: { ...projection, observations: [] } });
    expect(screen.getByText("No geographic observations are available for the current investigation.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Switch to Relationship View" })).toBeVisible();
  });

  it("keeps the usable map mounted when final basemap detail is delayed", async () => {
    const user = userEvent.setup();
    renderMap();

    await user.click(screen.getByRole("button", { name: "Trigger map delay" }));

    expect(screen.getByLabelText("Mock map")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Basemap detail is taking longer than expected.");
    expect(screen.getByRole("button", { name: "Retry Map" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Switch to Relationship View" })).toBeVisible();
  });
});
