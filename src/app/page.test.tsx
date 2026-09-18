import { render, screen } from "@testing-library/react";
import HomePage from "./page";

describe("HomePage", () => {
  it("identifies NexusAI as an investigation platform with Enter workspace CTA", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /NexusAI/i }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /enter workspace/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
