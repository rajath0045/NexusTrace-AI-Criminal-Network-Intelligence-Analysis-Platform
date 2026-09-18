import { render, screen } from "@testing-library/react";
import HomePage from "./page";

describe("HomePage", () => {
  it("identifies NexusTrace as an investigation platform", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /NexusTrace/i }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /enter workspace/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
