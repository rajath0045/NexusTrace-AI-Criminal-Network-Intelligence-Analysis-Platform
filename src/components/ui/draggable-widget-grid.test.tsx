import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DraggableWidgetGrid, { type WidgetItem } from "./draggable-widget-grid";

const items: WidgetItem[] = [
  { id: "alpha", label: "Alpha", size: "sm" },
  { id: "bravo", label: "Bravo", size: "sm" },
  { id: "charlie", label: "Charlie", size: "sm" },
];

describe("DraggableWidgetGrid", () => {
  it("keeps fixed mode out of the keyboard reorder path", () => {
    const onChange = vi.fn();
    render(
      <DraggableWidgetGrid
        items={items}
        editable={false}
        onChange={onChange}
        renderItem={(item) => <span>{item.label}</span>}
      />,
    );

    const first = screen.getByRole("listitem", { name: "Alpha" });
    expect(first).not.toHaveAttribute("tabindex");
    fireEvent.keyDown(first, { key: "ArrowRight", altKey: true });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(/hold Alt/i)).not.toBeInTheDocument();
  });

  it("supports Alt+Arrow keyboard reordering in customize mode", () => {
    const onChange = vi.fn();
    render(
      <DraggableWidgetGrid
        items={items}
        editable
        onChange={onChange}
        renderItem={(item) => <span>{item.label}</span>}
      />,
    );

    const first = screen.getByRole("listitem", { name: "Alpha" });
    expect(first).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(first, { key: "ArrowRight", altKey: true });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].map((item: WidgetItem) => item.id)).toEqual([
      "bravo",
      "alpha",
      "charlie",
    ]);
    expect(
      screen.getByText(/hold Alt and press the arrow keys/i),
    ).toHaveClass("sr-only");
  });
});
