import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/auth";
import { RelationshipStrength, UserRole, VerificationState } from "@/domain/model";
import type { GraphRepository } from "@/server/graph/graph-repository";
import { GraphService } from "./graph-service";

const actor: Actor = {
  userId: "investigator",
  email: "investigator@nexustrace.demo",
  displayName: "Ishaan Sen",
  role: UserRole.Investigator,
  departmentId: "10000000-0000-4000-8000-000000000003",
};

function repositoryStub(): GraphRepository {
  return {
    findEntityForActor: vi.fn(),
    getNeighborhood: vi.fn(),
    findRelationshipForActor: vi.fn(),
    createRelationship: vi.fn(),
    reviewRelationship: vi.fn(),
  };
}

describe("GraphService", () => {
  it("defaults to verified primary one-hop intelligence", async () => {
    const repository = repositoryStub();
    vi.mocked(repository.getNeighborhood).mockResolvedValue({
      focusEntity: { id: "root" },
      nodes: [],
      edges: [],
      activeFilters: {
        hops: 1,
        strengths: [RelationshipStrength.Primary],
        verificationStates: [VerificationState.Verified],
      },
    } as never);
    const service = new GraphService(repository);

    await service.getNeighborhood(actor, "60000000-0000-4000-8000-000000000003");

    expect(repository.getNeighborhood).toHaveBeenCalledWith(actor, expect.any(String), {
      hops: 1,
      strengths: [RelationshipStrength.Primary],
      verificationStates: [VerificationState.Verified],
    });
  });

  it("returns not found for an unauthorized relationship without exposing its existence", async () => {
    const repository = repositoryStub();
    vi.mocked(repository.findRelationshipForActor).mockResolvedValue(null);
    const service = new GraphService(repository);

    await expect(service.getRelationshipDetail(actor, "70000000-0000-4000-8000-000000000001"))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
