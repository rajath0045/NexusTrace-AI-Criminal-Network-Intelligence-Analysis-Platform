import { describe, expect, it } from "vitest";
import { graphRelationshipType } from "./neo4j-projection";

describe("Neo4j canonical projection mapping", () => {
  it("uses explicit, safe semantic relationship types", () => {
    expect(graphRelationshipType("OWNS")).toBe("OWNS");
    expect(graphRelationshipType("TRANSFERRED_TO")).toBe("TRANSFERRED_TO");
  });

  it("falls back to a semantic related edge instead of interpolating an unknown type", () => {
    expect(graphRelationshipType("untrusted; MATCH (n) DETACH DELETE n")).toBe("RELATED_TO");
  });
});
