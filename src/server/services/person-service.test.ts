import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/auth";
import { CaseParticipation, UserRole } from "@/domain/model";
import type { PersonRepository } from "@/server/repositories/person-repository";
import { PersonService } from "./person-service";

const departmentActor: Actor = {
  userId: "department-user",
  email: "department@nexustrace.demo",
  displayName: "Dev Malhotra",
  role: UserRole.DepartmentUser,
  departmentId: "cyber",
};

function repositoryStub(): PersonRepository {
  return {
    findProfileForActor: vi.fn(async () => null),
    listForCase: vi.fn(async () => []),
    listAssociationCandidates: vi.fn(async () => []),
    associateWithCase: vi.fn(),
  };
}

describe("PersonService", () => {
  it("does not reveal a person without an authorized case", async () => {
    const service = new PersonService(repositoryStub());

    await expect(service.getPersonProfile(departmentActor, "restricted-person"))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("prevents investigators from associating people with cases", async () => {
    const repository = repositoryStub();
    const service = new PersonService(repository);
    const investigator = { ...departmentActor, role: UserRole.Investigator };

    await expect(service.associatePerson(investigator, {
      caseId: "30000000-0000-4000-8000-000000000001",
      personId: "40000000-0000-4000-8000-000000000001",
      participation: CaseParticipation.Witness,
      notes: "Authorized synthetic case observation.",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repository.associateWithCase).not.toHaveBeenCalled();
  });

  it("validates case participation before persistence", async () => {
    const repository = repositoryStub();
    const service = new PersonService(repository);

    await expect(service.associatePerson(departmentActor, {
      caseId: "not-a-uuid",
      personId: "also-not-a-uuid",
      participation: CaseParticipation.Suspect,
    })).rejects.toMatchObject({ name: "ZodError" });
    expect(repository.associateWithCase).not.toHaveBeenCalled();
  });
});
