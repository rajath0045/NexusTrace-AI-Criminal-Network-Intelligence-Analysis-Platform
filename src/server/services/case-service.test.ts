import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@/domain/model";
import type { Actor } from "@/domain/auth";
import type { CaseRepository } from "@/server/repositories/case-repository";
import { CaseService } from "./case-service";

const departmentActor: Actor = {
  userId: "department-user",
  email: "department@nexustrace.demo",
  displayName: "Dev Malhotra",
  role: UserRole.DepartmentUser,
  departmentId: "cyber",
};

function repositoryStub(): CaseRepository {
  return {
    listForActor: vi.fn(async () => []),
    findForActor: vi.fn(async () => null),
    create: vi.fn(),
  };
}

describe("CaseService", () => {
  it("does not reveal a restricted case from another department", async () => {
    const service = new CaseService(repositoryStub());

    await expect(service.getCase(departmentActor, "restricted-case")).rejects.toMatchObject(
      { code: "NOT_FOUND" },
    );
  });

  it("prevents investigators from creating cases", async () => {
    const service = new CaseService(repositoryStub());
    const investigator = { ...departmentActor, role: UserRole.Investigator };

    await expect(
      service.createCase(investigator, {
        firNumber: "FIR-900",
        caseNumber: "CCU-2026-900",
        title: "Synthetic test case",
        category: "Cyber fraud",
        description: "A synthetic test record used only by the unit test.",
        occurrenceLocation: "Bengaluru, Karnataka",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
