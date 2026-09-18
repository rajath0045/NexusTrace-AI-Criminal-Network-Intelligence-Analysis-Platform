import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IncidentStatus, IncidentSubmissionStatus, IncidentType, IncidentVerificationLevel } from "@/domain/model";

vi.mock("@/features/workspace/workspace-grid", () => ({
  WorkspaceGrid: ({ widgets }: { widgets: Array<{ id: string; content: React.ReactNode }> }) => <section>{widgets.map((widget) => <div key={widget.id}>{widget.content}</div>)}</section>,
}));

import { InvestigationWorkspace } from "./investigation-workspace";

const incident = { id: "80000000-0000-4000-8000-000000000001", incidentNumber: "INC-108", incidentType: IncidentType.Meeting, title: "Synthetic meeting", occurredAt: new Date("2026-08-16T12:00:00.000Z"), status: IncidentStatus.Active, submissionStatus: IncidentSubmissionStatus.Accepted, verificationLevel: IncidentVerificationLevel.DepartmentVerified, departmentName: "Cyber", caseId: "30000000-0000-4000-8000-000000000001", caseFirNumber: "FIR-108" };
const response = { person: { id: "40000000-0000-4000-8000-000000000001", displayName: "Arjun Mehta" }, incident: { ...incident, occurredAt: incident.occurredAt.toISOString() }, window: { startTime: "2026-08-09T12:00:00.000Z", endTime: "2026-08-18T12:00:00.000Z", baselineStartTime: "2026-08-02T12:00:00.000Z", baselineEndTime: "2026-08-09T11:59:59.999Z", beforeDays: 7, afterDays: 2 }, timeline: [], findings: [{ id: "communication-spike", persistentId: "finding-1", category: "COMMUNICATION", title: "Communication volume changed materially", detail: "12 records compared with 3.", status: "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED", reviewStatus: "UNREVIEWED", supportingRecordIds: ["communication-1"], evidence: [{ id: "50000000-0000-4000-8000-000000000001", verificationLevel: "DEPARTMENT_VERIFIED" }], verificationLevels: ["DEPARTMENT_VERIFIED"] }], communicationMetrics: [{ label: "Window communications", value: "12", detail: "Window." }], financialMetrics: [], networkMetrics: [], crossCaseMetrics: [] };

describe("InvestigationWorkspace", () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  it("runs a bounded authorized analysis and exposes protected evidence context", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => response }));
    render(<InvestigationWorkspace people={[{ id: response.person.id, displayName: response.person.displayName }]} incidents={[incident]} initialItems={[]} />);
    expect(screen.getByText("Select an incident window")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Run analysis" }));
    expect(await screen.findByText("Communication volume changed materially")).toBeVisible();
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("beforeDays=7");
    expect(screen.getByRole("link", { name: /Evidence · DEPARTMENT_VERIFIED/ })).toHaveAttribute("href", "/api/evidence/50000000-0000-4000-8000-000000000001");
  });
  it("keeps copilot behind an analysis context and displays its review notice", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => response }).mockResolvedValueOnce({ ok: true, json: async () => ({ answer: "Communication changed.", evidence: [], notice: "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED" }) }));
    render(<InvestigationWorkspace people={[{ id: response.person.id, displayName: response.person.displayName }]} incidents={[incident]} initialItems={[]} />);
    await user.click(screen.getByRole("button", { name: "Run analysis" }));
    await screen.findByText("Communication volume changed materially");
    await user.type(screen.getByPlaceholderText("What changed in communications?"), "What changed?");
    await user.click(screen.getByRole("button", { name: "Ask controlled copilot" }));
    expect(await screen.findByText("Communication changed.")).toBeVisible();
    expect(screen.getAllByText("INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED").length).toBeGreaterThan(0);
  });
});
