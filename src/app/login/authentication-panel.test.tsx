import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthenticationPanel } from "./authentication-panel";

describe("AuthenticationPanel", () => {
  it("presents only the NexusTrace heading and three access choices", () => {
    render(<AuthenticationPanel action={vi.fn()} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "NEXUSTRACE INTELLIGENCE SYSTEM",
      }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Administrator" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Department" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Investigator" })).toBeVisible();
    expect(screen.queryByText(/identity verification/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/select access level/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/choose your authorized nexustrace access level/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/full system administrative access/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/authentication events are recorded/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });

  it("opens the matching sign-in form and returns to role selection", async () => {
    const user = userEvent.setup();
    render(<AuthenticationPanel action={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /department/i }));

    expect(
      screen.getByRole("heading", { name: /department sign in/i }),
    ).toBeVisible();
    expect(screen.getByText(/department access/i)).toBeVisible();
    expect(screen.getByLabelText(/email address/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /change access level/i }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "NEXUSTRACE INTELLIGENCE SYSTEM",
      }),
    ).toBeVisible();
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });

  it("activates a role option with the keyboard", async () => {
    const user = userEvent.setup();
    render(<AuthenticationPanel action={vi.fn()} />);

    screen.getByRole("button", { name: /investigator/i }).focus();
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("heading", { name: /investigator sign in/i }),
    ).toBeVisible();
  });

  it("shows an icon for every access choice", () => {
    render(<AuthenticationPanel action={vi.fn()} />);

    const roleButtons = [
      screen.getByRole("button", { name: "Administrator" }),
      screen.getByRole("button", { name: "Department" }),
      screen.getByRole("button", { name: "Investigator" }),
    ];

    for (const button of roleButtons) {
      expect(button.querySelector("svg")).toBeInTheDocument();
    }
  });
});
