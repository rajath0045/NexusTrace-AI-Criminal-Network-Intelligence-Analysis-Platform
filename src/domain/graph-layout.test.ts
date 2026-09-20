import { describe, expect, it } from "vitest";
import { graphPresentationSchema } from "./graph-layout";

describe("per-user graph presentation metadata", () => {
  it("keeps graph coordinates and routing bounded presentation data", () => {
    const parsed = graphPresentationSchema.parse({
      version: 1,
      positions: { "60000000-0000-4000-8000-000000000003": { x: 412, y: 290 } },
      edgeRoutes: { "70000000-0000-4000-8000-000000000001": 28 },
      algorithm: "cose",
    });
    expect(parsed.positions["60000000-0000-4000-8000-000000000003"]).toEqual({ x: 412, y: 290 });
    expect(parsed.edgeRoutes["70000000-0000-4000-8000-000000000001"]).toBe(28);
  });

  it("rejects a layout that attempts to store unbounded coordinates", () => {
    expect(() => graphPresentationSchema.parse({ version: 1, positions: { "60000000-0000-4000-8000-000000000003": { x: 50_000, y: 0 } } })).toThrow();
  });
});
