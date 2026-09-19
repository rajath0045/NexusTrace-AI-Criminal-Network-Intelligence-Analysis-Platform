import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/domain/model";
import { AppShellClient, type ShellNavigationItem } from "./app-shell-client";

const pathname = vi.hoisted(() => ({ value: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
}));

vi.mock("@/app/login/actions", () => ({
  logoutAction: vi.fn(),
}));

const actor = {
  userId: "operator-1",
  email: "aditi@nexustrace.demo",
  displayName: "Aditi Rao",
  role: UserRole.Administrator,
  departmentId: "department-1",
};

const navigation: ShellNavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/cases", label: "Cases", icon: "cases" },
];

describe("AppShellClient", () => {
  beforeEach(() => {
    pathname.value = "/dashboard";
  });

  it("starts compact and expands the desktop sidebar on hover", async () => {
    render(
      <AppShellClient actor={actor} navigation={navigation}>
        <p>Authorized content</p>
      </AppShellClient>,
    );

    const sidebar = screen.getByLabelText("NexusTrace navigation");
    expect(within(sidebar).queryByText("NEXUSTRACE")).not.toBeInTheDocument();

    fireEvent.mouseEnter(sidebar);
    await waitFor(() => {
      expect(within(sidebar).getByText("NEXUSTRACE")).toBeInTheDocument();
      expect(within(sidebar).getByText("Aditi Rao")).toBeInTheDocument();
    });

    fireEvent.mouseLeave(sidebar);
    await waitFor(() => {
      expect(within(sidebar).queryByText("NEXUSTRACE")).not.toBeInTheDocument();
    });
  });

  it("marks only the active route as the current page", () => {
    pathname.value = "/cases";
    render(
      <AppShellClient actor={actor} navigation={navigation}>
        <p>Authorized content</p>
      </AppShellClient>,
    );

    expect(screen.getByRole("link", { name: "Cases" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("opens and closes the mobile drawer with controls and Escape", async () => {
    const user = userEvent.setup();
    render(
      <AppShellClient actor={actor} navigation={navigation}>
        <p>Authorized content</p>
      </AppShellClient>,
    );

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByLabelText("Mobile navigation")).toBeVisible();
    expect(screen.getAllByText("Aditi Rao").length).toBeGreaterThan(0);

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByLabelText("Mobile navigation")).not.toBeInTheDocument();
    });
  });
});
