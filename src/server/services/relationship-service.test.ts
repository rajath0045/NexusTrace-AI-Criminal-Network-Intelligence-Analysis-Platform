import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/auth";
import {
  EvidenceConfidence,
  RelationshipStrength,
  UserRole,
  VerificationState,
} from "@/domain/model";
import type { GraphRepository } from "@/server/graph/graph-repository";
import { RelationshipService } from "./relationship-service";

const actor: Actor = {
  userId: "department-user",
  email: "department@nexustrace.demo",
  displayName: "Dev Malhotra",
  role: UserRole.DepartmentUser,
  departmentId: "10000000-0000-4000-8000-000000000002",
};

const input = {
  sourceEntityId: "60000000-0000-4000-8000-000000000001",
  targetEntityId: "60000000-0000-4000-8000-000000000007",
  relationshipType: "USES",
  strength: RelationshipStrength.Primary,
  evidenceConfidence: EvidenceConfidence.Probable,
  interactionCount: 4,
  interactionSummary: "Synthetic contact pattern; not proof of criminal involvement.",
  sources: [{
    evidenceId: "50000000-0000-4000-8000-000000000001",
    sourceCaseId: "30000000-0000-4000-8000-000000000001",
    note: "Synthetic source.",
  }],
};

function repositoryStub(): GraphRepository {
  return {
    findDefaultFocusForActor: vi.fn(),
    findEntityForActor: vi.fn(),
    getNeighborhood: vi.fn(),
    findRelationshipForActor: vi.fn(),
    createRelationship: vi.fn(),
    reviewRelationship: vi.fn(),
  };
}

describe("RelationshipService", () => {
  it("prevents investigators from creating verified intelligence directly", async () => {
    const service = new RelationshipService(repositoryStub());
    const investigator = { ...actor, role: UserRole.Investigator };

    await expect(service.createVerifiedRelationship(investigator, input))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects self relationships before persistence", async () => {
    const repository = repositoryStub();
    const service = new RelationshipService(repository);

    await expect(service.proposeRelationship(actor, {
      ...input,
      targetEntityId: input.sourceEntityId,
    })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(repository.createRelationship).not.toHaveBeenCalled();
  });

  it("requires provenance for verified relationships", async () => {
    const service = new RelationshipService(repositoryStub());
    const administrator = { ...actor, role: UserRole.Administrator };

    await expect(service.createVerifiedRelationship(administrator, { ...input, sources: [] }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("creates department submissions as pending regardless of relationship strength", async () => {
    const repository = repositoryStub();
    vi.mocked(repository.createRelationship).mockResolvedValue({ id: "relationship-1" } as never);
    const service = new RelationshipService(repository);

    await service.proposeRelationship(actor, input);

    expect(repository.createRelationship).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ strength: RelationshipStrength.Primary }),
      expect.objectContaining({ verificationState: VerificationState.Pending }),
    );
  });
});
