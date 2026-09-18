import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TimelineList } from "./timeline-list";

const items = [
  { id: "incident:1", type: "INCIDENT" as const, timestamp: new Date("2026-09-02T10:00:00.000Z"), title: "Incident event", description: "Incident detail", sourceRecordType: "INCIDENT" as const, sourceRecordId: "incident-1", caseId: null, incidentId: "incident-1", personIds: [], evidenceId: null },
  { id: "evidence:1", type: "EVIDENCE" as const, timestamp: new Date("2026-09-01T10:00:00.000Z"), title: "Evidence event", description: "Evidence detail", sourceRecordType: "EVIDENCE" as const, sourceRecordId: "evidence-1", caseId: "case-1", incidentId: null, personIds: [], evidenceId: "evidence-1" },
];

describe("TimelineList", () => {
  it("filters an already authorized chronological projection by supported source type", async () => {
    const user = userEvent.setup();
    render(<TimelineList items={items} />);
    expect(screen.getByText("Incident event")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "evidence" }));
    expect(screen.getByText("Evidence event")).toBeVisible();
    expect(screen.queryByText("Incident event")).not.toBeInTheDocument();
  });

  it("has a professional empty state", () => {
    render(<TimelineList items={[]} />);
    expect(screen.getByText("No timeline activity")).toBeVisible();
  });

  it("filters authoritative communication and financial timeline projections", async () => {
    const user = userEvent.setup();
    render(<TimelineList items={[...items, { id: "communication:1", type: "COMMUNICATION", timestamp: new Date("2026-09-03T10:00:00.000Z"), title: "Communication event", description: "Protected metadata", sourceRecordType: "COMMUNICATION", sourceRecordId: "communication-1", caseId: "case-1", incidentId: null, personIds: [], evidenceId: null }]} />);
    await user.click(screen.getByRole("button", { name: "communication" }));
    expect(screen.getByText("Communication event")).toBeVisible();
    expect(screen.queryByText("Incident event")).not.toBeInTheDocument();
  });
});
