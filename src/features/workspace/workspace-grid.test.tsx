import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WORKSPACE_LAYOUT_VERSION } from "@/domain/workspace";
import { WorkspaceGrid } from "./workspace-grid";
import {
  resetWorkspaceLayoutAction,
  saveWorkspaceLayoutAction,
} from "./workspace-actions";

vi.mock("./workspace-actions", () => ({
  saveWorkspaceLayoutAction: vi.fn(),
  resetWorkspaceLayoutAction: vi.fn(),
}));

const initialItems = [
  { id: "case-status", label: "Case status", size: "wide" as const },
  {
    id: "recent-investigations",
    label: "Recent investigations",
    size: "lg" as const,
  },
];

const widgets = [
  { id: "case-status", content: <p>Case status content</p> },
  { id: "recent-investigations", content: <p>Recent content</p> },
];

describe("WorkspaceGrid", () => {
  beforeEach(() => {
    vi.mocked(saveWorkspaceLayoutAction).mockReset();
    vi.mocked(resetWorkspaceLayoutAction).mockReset();
  });

  it("opens in fixed mode and saves size changes back into fixed mode", async () => {
    const user = userEvent.setup();
    vi.mocked(saveWorkspaceLayoutAction).mockImplementation(async (input) => ({
      version: WORKSPACE_LAYOUT_VERSION,
      items: input.items,
    }));

    render(
      <WorkspaceGrid
        workspaceKey="dashboard"
        initialItems={initialItems}
        widgets={widgets}
        ariaLabel="Test workspace"
      />,
    );

    expect(screen.getByText("Fixed layout")).toBeVisible();
    expect(screen.queryByRole("group", { name: /Size for/i })).not.toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Case status" })).not.toHaveAttribute(
      "tabindex",
    );

    await user.click(screen.getByRole("button", { name: "Customize layout" }));
    expect(screen.getByText("Customize mode")).toBeVisible();
    expect(screen.getByRole("listitem", { name: "Case status" })).toHaveAttribute(
      "tabindex",
      "0",
    );

    const firstSizeGroup = screen.getByRole("group", {
      name: "Size for Case status",
    });
    await user.click(
      firstSizeGroup.querySelector<HTMLButtonElement>("button:last-child")!,
    );
    await user.click(screen.getByRole("button", { name: /Done \/ Save layout/i }));

    await waitFor(() => expect(saveWorkspaceLayoutAction).toHaveBeenCalledTimes(1));
    expect(
      vi.mocked(saveWorkspaceLayoutAction).mock.calls[0][0].items[0].size,
    ).toBe("lg");
    await waitFor(() => expect(screen.getByText("Fixed layout")).toBeVisible());
    expect(screen.queryByRole("group", { name: /Size for/i })).not.toBeInTheDocument();
  });

  it("resets only the current page and returns to fixed mode", async () => {
    const user = userEvent.setup();
    vi.mocked(resetWorkspaceLayoutAction).mockResolvedValue({
      version: WORKSPACE_LAYOUT_VERSION,
      items: initialItems,
    });

    render(
      <WorkspaceGrid
        workspaceKey="cases"
        initialItems={initialItems}
        widgets={widgets}
        ariaLabel="Cases test workspace"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Customize layout" }));
    await user.click(screen.getByRole("button", { name: "Reset page layout" }));

    await waitFor(() =>
      expect(resetWorkspaceLayoutAction).toHaveBeenCalledWith("cases"),
    );
    await waitFor(() => expect(screen.getByText("Fixed layout")).toBeVisible());
  });
});
