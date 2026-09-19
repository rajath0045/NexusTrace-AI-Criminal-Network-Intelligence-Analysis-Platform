import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GlobalSearch } from "./global-search";

describe("GlobalSearch", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("debounces an authorized request and supports keyboard navigation", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ query: "FIR", groups: [{ type: "CASE", label: "Cases / FIRs", results: [{ id: "case", type: "CASE", title: "FIR-108", metadata: "Synthetic case", href: "/cases/case" }] }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    const user = userEvent.setup();
    render(<GlobalSearch />);
    const input = screen.getByRole("combobox");
    await user.type(input, "FIR");
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce(), { timeout: 1_000 });
    expect(await screen.findByRole("option", { name: /FIR-108/i })).toBeVisible();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /FIR-108/i })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the empty state non-disclosing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ query: "no", groups: [] }), { status: 200 })));
    const user = userEvent.setup(); render(<GlobalSearch />); await user.type(screen.getByRole("combobox"), "none");
    expect(await screen.findByText("No authorized records found")).toBeVisible();
    expect(screen.getByText(/No accessible cases, people, incidents, or network entities/)).toBeVisible();
  });
});
