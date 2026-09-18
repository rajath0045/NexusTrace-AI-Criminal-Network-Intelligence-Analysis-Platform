import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvidenceConfidence, GraphEntityType, RelationshipStrength, VerificationState } from "@/domain/model";
import { NetworkExplorer } from "./network-explorer";

vi.mock("./network-canvas", () => ({
  NetworkCanvas: ({ onNodeSelect, onEdgeSelect, focusMode }: { onNodeSelect: (id: string) => void; onEdgeSelect: (id: string) => void; focusMode: boolean }) => (
    <div aria-label="Investigation graph">
      <output data-testid="focus-mode">{String(focusMode)}</output>
      <button type="button" onClick={() => onNodeSelect("vehicle")}>Select vehicle</button>
      <button type="button" onClick={() => onEdgeSelect("edge-1")}>Select association</button>
    </div>
  ),
}));

vi.mock("@/features/workspace/workspace-grid", () => ({
  WorkspaceGrid: ({ widgets }: { widgets: Array<{ content: React.ReactNode }> }) => <section aria-label="Graph investigation panels">{widgets.map((widget, index) => <div key={index}>{widget.content}</div>)}</section>,
}));

const graph = {
  focusEntity: { id: "person", entityType: GraphEntityType.Person, displayLabel: "Aditi Rao", verificationState: VerificationState.Verified, canonicalRecord: { type: "PERSON" as const, id: "person-record" } },
  nodes: [
    { id: "person", entityType: GraphEntityType.Person, displayLabel: "Aditi Rao", verificationState: VerificationState.Verified, canonicalRecord: { type: "PERSON" as const, id: "person-record" } },
    { id: "vehicle", entityType: GraphEntityType.Vehicle, displayLabel: "KA-01-XX-1234", verificationState: VerificationState.Verified, canonicalRecord: null },
  ],
  edges: [{ id: "edge-1", sourceId: "person", targetId: "vehicle", relationshipType: "ASSOCIATED_WITH", strength: RelationshipStrength.Primary, evidenceConfidence: EvidenceConfidence.Probable, verificationState: VerificationState.Verified, interactionCount: 3, interactionSummary: null, firstObservedAt: null, latestObservedAt: null }],
  activeFilters: { hops: 1 as const, strengths: [RelationshipStrength.Primary], verificationStates: [VerificationState.Verified] },
  provenanceSummaries: [{ relationshipId: "edge-1", sourceCount: 1, sourceCaseIds: ["case-1"] }],
};

const detail = {
  ...graph.edges[0],
  sourceEntity: graph.nodes[0],
  targetEntity: graph.nodes[1],
  departmentName: "Cybercrime",
  createdByName: "Investigator", verifiedByName: "Supervisor", verifiedAt: "2026-09-18T00:00:00.000Z",
  provenance: [{ id: "source-1", evidenceId: "evidence-1", evidenceFilename: "call-log.csv", evidenceVerificationState: VerificationState.Verified, sourceCaseId: "case-1", sourceFirNumber: "FIR-212", sourceCaseTitle: "Call records", note: "Corroborated call record" }],
};

describe("NetworkExplorer", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("starts with only primary and verified relationships enabled", () => {
    render(<NetworkExplorer initialGraph={graph} initialLayoutItems={[]} />);

    expect(screen.getByRole("button", { name: "Primary relationships" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Secondary relationships" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Tertiary relationships" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Verified relationships" })).toHaveAttribute("aria-pressed", "true");
  });

  it("uses server filtering when secondary relationships and three hops are selected", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => graph } as Response);
    render(<NetworkExplorer initialGraph={graph} initialLayoutItems={[]} />);

    await user.click(screen.getByRole("button", { name: "Secondary relationships" }));
    await user.click(screen.getByRole("button", { name: "3 hops" }));

    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining("hops=3"), expect.anything()));
    expect(vi.mocked(fetch).mock.calls.at(-1)?.[0]).toContain("strengths=PRIMARY%2CSECONDARY");
  });

  it("uses the exact Task 7 verification state when an investigator includes pending intelligence", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => graph } as Response);
    render(<NetworkExplorer initialGraph={graph} initialLayoutItems={[]} />);

    await user.click(screen.getByRole("button", { name: "Pending review relationships" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining("verificationStates=VERIFIED%2CPENDING"), expect.anything()));
  });

  it("pivots from a selected node and exposes authorized provenance for a selected edge", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...graph, focusEntity: graph.nodes[1] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => detail } as Response);
    render(<NetworkExplorer initialGraph={graph} initialLayoutItems={[]} />);

    await user.click(screen.getByRole("button", { name: "Select vehicle" }));
    expect(screen.getByText("KA-01-XX-1234")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Explore from this entity" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining("focus=vehicle"), expect.anything()));

    await user.click(screen.getByRole("button", { name: "Select association" }));
    expect(await screen.findByText("Why this connection exists")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open call-log.csv" })).toHaveAttribute("href", "/api/evidence/evidence-1");
  });

  it("enters neighborhood focus mode after node selection and clears it without changing server filters", async () => {
    const user = userEvent.setup();
    render(<NetworkExplorer initialGraph={graph} initialLayoutItems={[]} />);

    await user.click(screen.getByRole("button", { name: "Select vehicle" }));
    expect(screen.getByTestId("focus-mode")).toHaveTextContent("true");
    expect(screen.getByRole("button", { name: "Clear focus" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Clear focus" }));
    expect(screen.getByTestId("focus-mode")).toHaveTextContent("false");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the marker legend compact until explicitly opened", async () => {
    const user = userEvent.setup();
    render(<NetworkExplorer initialGraph={graph} initialLayoutItems={[]} />);

    expect(screen.queryByText("Node types")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show graph legend" }));
    expect(screen.getByText("Node types")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Hide graph legend" }));
    expect(screen.queryByText("Node types")).not.toBeInTheDocument();
  });

  it("explains an empty filtered graph and a failed graph request", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ ...graph, edges: [], nodes: [graph.focusEntity] }) } as Response);
    render(<NetworkExplorer initialGraph={graph} initialLayoutItems={[]} />);

    await user.click(screen.getByRole("button", { name: "Secondary relationships" }));
    expect(await screen.findByText(/No authorized relationships match these filters/i)).toBeVisible();

    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    await user.click(screen.getByRole("button", { name: "Tertiary relationships" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be loaded/i);
  });
});
