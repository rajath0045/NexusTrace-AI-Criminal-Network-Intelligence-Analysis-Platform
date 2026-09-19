import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EvidenceConfidence,
  GraphEntityType,
  IncidentVerificationLevel,
  LocationObservationType,
  LocationSourceRecordType,
  RelationshipStrength,
  VerificationState,
} from "@/domain/model";
import type { SerializedGeographicProjection } from "./geographic-view-model";
import { NetworkExplorer } from "./network-explorer";

vi.mock("./geographic-network-map", () => ({
  GeographicNetworkMap: ({ onEntitySelect, onConnectionSelect, heatmap, showNetwork, showObservations }: { onEntitySelect: (id: string) => void; onConnectionSelect: (id: string) => void; heatmap: boolean; showNetwork: boolean; showObservations: boolean }) => <div aria-label="Geographic network map"><output data-testid="layer-state">{`${showNetwork}-${showObservations}-${heatmap}`}</output><button type="button" onClick={() => onEntitySelect("vehicle")}>Select vehicle marker</button><button type="button" onClick={() => onConnectionSelect("person:vehicle")}>Select activity badge</button></div>,
}));

vi.mock("./network-canvas", () => ({
  NetworkCanvas: ({ onNodeSelect, onEdgeSelect }: { onNodeSelect: (id: string) => void; onEdgeSelect: (id: string) => void }) => <div aria-label="Relationship network"><button type="button" onClick={() => onNodeSelect("vehicle")}>Select vehicle node</button><button type="button" onClick={() => onEdgeSelect("edge-1")}>Select relationship edge</button></div>,
}));

vi.mock("@/features/workspace/workspace-grid", () => ({
  WorkspaceGrid: ({ widgets }: { widgets: Array<{ id: string; content: React.ReactNode }> }) => <section aria-label="Network signal context panels">{widgets.map((widget) => <div key={widget.id}>{widget.content}</div>)}</section>,
}));

const person = { id: "person", entityType: GraphEntityType.Person, displayLabel: "Aditi Rao", verificationState: VerificationState.Verified, canonicalRecord: { type: "PERSON" as const, id: "person-record" } };
const vehicle = { id: "vehicle", entityType: GraphEntityType.Vehicle, displayLabel: "KA-01-XX-1234", verificationState: VerificationState.Verified, canonicalRecord: null };
const observation = (id: string, graphEntityId: string, entityType: GraphEntityType, entityLabel: string, longitude: number) => ({ id, graphEntityId, entityType, entityLabel, latitude: 12.97, longitude, observedAt: "2026-09-18T20:42:00.000Z", observationType: entityType === GraphEntityType.Vehicle ? LocationObservationType.VehicleObservation : LocationObservationType.ObservedPersonLocation, locationLabel: entityType === GraphEntityType.Vehicle ? "Vehicle observation Z" : "Location X", context: null, accuracyMeters: 25, sourceRecordType: LocationSourceRecordType.Communication, sourceRecordId: "record-1", sourceEvidenceId: "evidence-1", verificationLevel: IncidentVerificationLevel.DepartmentVerified });

const projection: SerializedGeographicProjection = {
  focusEntity: person,
  graph: {
    focusEntity: person,
    nodes: [person, vehicle],
    edges: [{ id: "edge-1", sourceId: "person", targetId: "vehicle", relationshipType: "ASSOCIATED_WITH", strength: RelationshipStrength.Primary, evidenceConfidence: EvidenceConfidence.Probable, verificationState: VerificationState.Verified, interactionCount: 3, interactionSummary: null, firstObservedAt: null, latestObservedAt: null }],
    activeFilters: { hops: 1, strengths: [RelationshipStrength.Primary], verificationStates: [VerificationState.Verified] },
    provenanceSummaries: [{ relationshipId: "edge-1", sourceCount: 1, sourceCaseIds: ["case-1"] }],
  },
  observations: [observation("obs-a", "person", GraphEntityType.Person, "Aditi Rao", 77.59), observation("obs-b", "vehicle", GraphEntityType.Vehicle, "KA-01-XX-1234", 77.66)],
  activities: [],
  connections: [{
    id: "person:vehicle", sourceEntityId: "person", targetEntityId: "vehicle", sourceLabel: "Aditi Rao", targetLabel: "KA-01-XX-1234", sourceObservation: observation("obs-a", "person", GraphEntityType.Person, "Aditi Rao", 77.59), targetObservation: observation("obs-b", "vehicle", GraphEntityType.Vehicle, "KA-01-XX-1234", 77.66), strength: RelationshipStrength.Primary, verification: IncidentVerificationLevel.DepartmentVerified, relationshipIds: ["edge-1"], counts: { calls: 1, messages: 0, emails: 0, digitalContacts: 0, financial: 0, relationships: 1 }, records: [{ id: "COM-108", kind: "COMMUNICATION", label: "CALL · COM-108", occurredAt: "2026-09-18T20:45:00.000Z", interactionCount: 1, verification: IncidentVerificationLevel.DepartmentVerified, sourceEvidenceId: "evidence-1", caseId: "case-1", caseFirNumber: "FIR-212", sourceLocation: { status: "KNOWN", eventAt: "2026-09-18T20:45:00.000Z", temporalDistanceSeconds: 180, observation: observation("obs-a", "person", GraphEntityType.Person, "Aditi Rao", 77.59) }, destinationLocation: { status: "UNKNOWN", eventAt: "2026-09-18T20:45:00.000Z", temporalDistanceSeconds: null, observation: null }, durationSeconds: 272, amount: null, currency: null }],
  }],
  timeline: [{ id: "time-1", type: "COMMUNICATION", timestamp: "2026-09-18T20:45:00.000Z", title: "Call COM-108", description: "Authorized call", sourceRecordType: "COMMUNICATION", sourceRecordId: "COM-108", caseId: "case-1", incidentId: null, personIds: ["person"], evidenceId: "evidence-1" }],
  findings: [],
  summary: { communicationCount: 1, financialCount: 0, verifiedObservationCount: 2, relatedCaseCount: 1, evidenceCount: 1, unknownEndpointCount: 1 },
  generatedAt: "2026-09-19T00:00:00.000Z",
};

describe("NetworkExplorer", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("starts with the clear default scope and a geographic primary surface", () => {
    render(<NetworkExplorer initialProjection={projection} initialLayoutItems={[]} />);
    expect(screen.getByRole("button", { name: "Primary relationships" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Secondary relationships" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "1 hop" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Geographic network map")).toBeVisible();
  });

  it("uses server filtering for relationship tiers, traversal, and verification", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => projection } as Response);
    render(<NetworkExplorer initialProjection={projection} initialLayoutItems={[]} />);
    await user.click(screen.getByRole("button", { name: "Secondary relationships" }));
    await user.click(screen.getByRole("button", { name: "3 hops" }));
    await user.click(screen.getByRole("button", { name: "Pending relationships" }));
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining("verificationStates=VERIFIED%2CPENDING"), expect.anything()));
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("strengths=PRIMARY%2CSECONDARY"))).toBe(true);
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("hops=3"))).toBe(true);
  });

  it("uses one shared focus across map and relationship views", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ ...projection, focusEntity: vehicle, graph: { ...projection.graph, focusEntity: vehicle } }) } as Response);
    render(<NetworkExplorer initialProjection={projection} initialLayoutItems={[]} />);
    await user.click(screen.getByRole("button", { name: "Select vehicle marker" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining("focus=vehicle"), expect.anything()));
    await user.click(screen.getByRole("button", { name: /Relationship/ }));
    expect(screen.getByLabelText("Relationship network")).toBeVisible();
    expect(screen.getAllByText("KA-01-XX-1234").length).toBeGreaterThan(0);
  });

  it("shows temporal call provenance and never fabricates an unknown endpoint", async () => {
    const user = userEvent.setup();
    render(<NetworkExplorer initialProjection={projection} initialLayoutItems={[]} />);
    await user.click(screen.getByRole("button", { name: "Select activity badge" }));
    expect(screen.getByText(/Duration 4m 32s/)).toBeVisible();
    expect(screen.getAllByText("Location X").length).toBeGreaterThan(0);
    expect(screen.getByText("LOCATION UNKNOWN")).toBeVisible();
    expect(screen.getByText("COM-108")).toBeVisible();
    expect(screen.getByRole("link", { name: "Source evidence" })).toHaveAttribute("href", "/api/evidence/evidence-1");
  });

  it("constrains the server projection from a timeline selection", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => projection } as Response);
    render(<NetworkExplorer initialProjection={projection} initialLayoutItems={[]} />);
    await user.click(screen.getByRole("button", { name: /Call COM-108/ }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining("startTime="), expect.anything()));
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain("endTime=");
  });

  it("keeps layer toggles local to the map", async () => {
    const user = userEvent.setup();
    render(<NetworkExplorer initialProjection={projection} initialLayoutItems={[]} />);
    await user.click(screen.getByRole("button", { name: "Activity heatmap" }));
    expect(screen.getByTestId("layer-state")).toHaveTextContent("true-true-true");
    expect(fetch).not.toHaveBeenCalled();
  });
});
