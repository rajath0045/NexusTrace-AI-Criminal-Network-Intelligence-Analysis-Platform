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
const quality = { total: 0, reviewed: 0, unreviewed: 0, acknowledged: 0, dismissed: 0, falsePositive: 0, needsMoreEvidence: 0, escalated: 0, averageTurnaroundHours: null, medianTurnaroundHours: null, byType: [], dispositionTrend: [] };
const persisted = { ...response.findings[0], persistentId: "70000000-0000-4000-8000-000000000001", findingKey: "synthetic", personId: response.person.id, personName: response.person.displayName, incidentId: incident.id, incidentNumber: incident.incidentNumber, caseId: incident.caseId, caseFirNumber: incident.caseFirNumber, windowStart: response.window.startTime, windowEnd: response.window.endTime, generatedAt: response.window.endTime, snapshot: { capturedAt: response.window.endTime, baselineStartTime: response.window.baselineStartTime, baselineEndTime: response.window.baselineEndTime, metrics: response.communicationMetrics, comparison: { observed: 12, baseline: 3, delta: 9, percentageChange: 300, unit: "records" } }, reviews: [], supportingRecords: [{ id: "communication-1", type: "COMMUNICATION", label: "COM-108", observedAt: response.window.endTime, verificationState: "DEPARTMENT_VERIFIED", description: "CALL · Arjun Mehta → Device", sourceEvidenceIds: [] }] };

describe("InvestigationWorkspace", () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  it("runs a bounded authorized analysis and exposes protected evidence context", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (input: RequestInfo | URL) => ({ ok: true, json: async () => String(input).includes("/analyze") ? response : String(input).includes("/findings") ? { items: [], nextCursor: null } : quality })));
    render(<InvestigationWorkspace people={[{ id: response.person.id, displayName: response.person.displayName }]} incidents={[incident]} initialItems={[]} />);
    expect(screen.getByText(/Select an incident window/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Run analysis" }));
    expect(await screen.findByText(/Communication volume changed materially/)).toBeVisible();
    expect(vi.mocked(fetch).mock.calls.map(([input]) => String(input)).find((url) => url.includes("/analyze"))).toContain("beforeDays=7");
    expect(screen.getByText("Communication volume changed materially")).toBeVisible();
  });
  it("keeps copilot behind an analysis context and displays its review notice", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (input: RequestInfo | URL) => ({ ok: true, json: async () => String(input).includes("/analyze") ? response : String(input).includes("/copilot") ? { answer: "Communication changed.", evidence: [], notice: "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED" } : String(input).includes("/findings") ? { items: [], nextCursor: null } : quality })));
    render(<InvestigationWorkspace people={[{ id: response.person.id, displayName: response.person.displayName }]} incidents={[incident]} initialItems={[]} />);
    await user.click(screen.getByRole("button", { name: "Run analysis" }));
    await screen.findByText("Communication volume changed materially");
    await user.type(screen.getByPlaceholderText("Why was this finding dismissed?"), "What changed?");
    await user.click(screen.getByRole("button", { name: "Ask controlled copilot" }));
    expect(await screen.findByText("Communication changed.")).toBeVisible();
    expect(screen.getByText("Communication changed.")).toBeVisible();
  });
  it("uses server filters and opens an authorized persisted finding detail", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      return { ok: true, json: async () => url.endsWith(`/${persisted.persistentId}`) ? persisted : url.includes("/findings") ? { items: [persisted], nextCursor: null } : quality };
    }));
    render(<InvestigationWorkspace people={[{ id: response.person.id, displayName: response.person.displayName }]} incidents={[incident]} initialItems={[]} />);
    expect(await screen.findByText(/Communication volume changed materially/)).toBeVisible();
    await user.selectOptions(screen.getByLabelText("Finding type filter"), "COMMUNICATION");
    await user.click(screen.getByRole("button", { name: /communication volume changed materially/i }));
    expect(await screen.findByText("Analysis window")).toBeVisible();
    expect(screen.getByText(/Observed 12 records; baseline 3/)).toBeVisible();
    expect(screen.getAllByText(/COM-108/).length).toBeGreaterThan(0);
    expect(vi.mocked(fetch).mock.calls.map(([input]) => String(input))).toContain(`/api/investigations/findings/${persisted.persistentId}`);
  });
  it("records a structured human disposition without offering a verification action", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith(`/${persisted.persistentId}`)) return { ok: true, json: async () => persisted };
      if (url.endsWith("/review") && init?.method === "POST") return { ok: true, json: async () => ({ ...persisted, reviewStatus: "ESCALATED", reviews: [{ id: "review-1", reviewerName: "Dev Malhotra", reviewerRole: "DEPARTMENT_USER", reviewerDepartmentName: "Cyber", previousStatus: "UNREVIEWED", status: "ESCALATED", reasonCode: "REQUIRES_SUPERVISOR_REVIEW", note: "Coordinate with supervisor.", createdAt: response.window.endTime }] }) };
      return { ok: true, json: async () => url.includes("/findings") ? { items: [persisted], nextCursor: null } : quality };
    }));
    render(<InvestigationWorkspace people={[{ id: response.person.id, displayName: response.person.displayName }]} incidents={[incident]} initialItems={[]} />);
    await user.click(await screen.findByRole("button", { name: /communication volume changed materially/i }));
    await user.selectOptions(screen.getByLabelText("Structured reason"), "REQUIRES_SUPERVISOR_REVIEW");
    await user.type(screen.getByLabelText("Reviewer note"), "Coordinate with supervisor.");
    await user.click(screen.getByRole("button", { name: "Escalate" }));
    const call = vi.mocked(fetch).mock.calls.find(([input]) => String(input).endsWith("/review"));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ status: "ESCALATED", reasonCode: "REQUIRES_SUPERVISOR_REVIEW", note: "Coordinate with supervisor." });
    expect(screen.queryByRole("button", { name: /verify/i })).not.toBeInTheDocument();
  });
});
