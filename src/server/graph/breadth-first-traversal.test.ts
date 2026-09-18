import { describe, expect, it, vi } from "vitest";
import { traverseBounded } from "./breadth-first-traversal";

describe("traverseBounded", () => {
  it("deduplicates edges and nodes while stopping at the requested depth", async () => {
    const loadLayer = vi.fn(async (frontier: string[]) => {
      if (frontier.includes("a")) {
        return [
          { id: "ab", sourceId: "a", targetId: "b" },
          { id: "ac", sourceId: "a", targetId: "c" },
        ];
      }
      return [
        { id: "ab", sourceId: "a", targetId: "b" },
        { id: "bd", sourceId: "b", targetId: "d" },
      ];
    });

    const result = await traverseBounded("a", 2, loadLayer);

    expect(result.nodeIds).toEqual(new Set(["a", "b", "c", "d"]));
    expect(result.edges.map((edge) => edge.id)).toEqual(["ab", "ac", "bd"]);
    expect(loadLayer).toHaveBeenCalledTimes(2);
  });

  it("never loads beyond three hops", async () => {
    await expect(traverseBounded("a", 4, vi.fn())).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });
});
