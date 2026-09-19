import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CaseStatus } from "@/domain/model";
import { DashboardCommandCenter } from "./dashboard-command-center";

const cases = [
  {
    id: "case-1",
    firNumber: "FIR-212",
    caseNumber: "CASE-212",
    title: "Authorized investigation",
    category: "Cyber crime",
    status: CaseStatus.Active,
    departmentName: "Cyber Crime Unit",
    updatedAt: new Date("2026-09-19T00:00:00.000Z"),
    peopleCount: 1,
    evidenceCount: 1,
  },
];

describe("DashboardCommandCenter", () => {
  it("renders only authorized route modules and uses real scoped metrics", () => {
    render(
      <DashboardCommandCenter
        cases={cases}
        incidentCount={2}
        canUseNetwork={false}
        canAnalyze={false}
      />,
    );

    expect(screen.getByText(/Latest authorized record: FIR-212/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View cases" })).toHaveAttribute(
      "href",
      "/cases",
    );
    expect(screen.getByRole("link", { name: "View incidents" })).toHaveAttribute(
      "href",
      "/incidents",
    );
    expect(screen.queryByRole("link", { name: "Open network" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open investigation" })).not.toBeInTheDocument();
  });

  it("activates a module from keyboard focus without requiring hover", async () => {
    render(
      <DashboardCommandCenter
        cases={cases}
        incidentCount={0}
        canUseNetwork
        canAnalyze
      />,
    );

    const networkModule = screen.getByText("Network").closest("article")!;
    fireEvent.focus(networkModule);
    await waitFor(() => {
      expect(networkModule).toHaveAttribute("data-active", "true");
    });
    expect(screen.getByRole("link", { name: "Open network" })).toHaveAttribute(
      "tabindex",
      "0",
    );
  });
});
