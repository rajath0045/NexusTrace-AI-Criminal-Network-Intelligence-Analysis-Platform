import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProfileTabs } from "./profile-tabs";

const labels = [
  "Identity",
  "Cases",
  "Associates",
  "Communications",
  "Financial Activity",
  "Assets",
  "Locations",
  "Evidence",
  "Relationships",
];

describe("ProfileTabs", () => {
  it("exposes every planned profile section and supports arrow-key navigation", async () => {
    const user = userEvent.setup();
    render(
      <ProfileTabs
        tabs={labels.map((label) => ({
          id: label.toLowerCase().replaceAll(" ", "-"),
          label,
          content: <p>{label} content</p>,
        }))}
      />,
    );

    const identity = screen.getByRole("tab", { name: "Identity" });
    expect(labels.map((label) => screen.getByRole("tab", { name: label }))).toHaveLength(9);
    expect(identity).toHaveAttribute("aria-selected", "true");

    identity.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Cases" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Cases" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Cases content");

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Relationships" })).toHaveFocus();
  });
});
