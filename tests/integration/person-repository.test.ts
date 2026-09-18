// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedSyntheticDemoData } from "../../prisma/seed";
import type { Actor } from "@/domain/auth";
import { CaseParticipation, UserRole } from "@/domain/model";
import { prisma } from "@/server/db/client";
import { PrismaPersonRepository } from "@/server/repositories/prisma-person-repository";

const departmentActor: Actor = {
  userId: "20000000-0000-4000-8000-000000000002",
  email: "department@nexustrace.demo",
  displayName: "Dev Malhotra",
  role: UserRole.DepartmentUser,
  departmentId: "10000000-0000-4000-8000-000000000002",
};

const administratorActor: Actor = {
  userId: "20000000-0000-4000-8000-000000000001",
  email: "admin@nexustrace.demo",
  displayName: "Aditi Rao",
  role: UserRole.Administrator,
  departmentId: "10000000-0000-4000-8000-000000000001",
};

describe("PrismaPersonRepository", () => {
  const repository = new PrismaPersonRepository();
  const cyberCaseId = "30000000-0000-4000-8000-000000000001";
  const financialPersonId = "40000000-0000-4000-8000-000000000004";

  beforeAll(async () => {
    await seedSyntheticDemoData();
    await prisma.casePerson.deleteMany({
      where: {
        caseId: cyberCaseId,
        personId: financialPersonId,
        participation: "WITNESS",
      },
    });
  });

  afterAll(async () => {
    await prisma.casePerson.deleteMany({
      where: {
        caseId: cyberCaseId,
        personId: financialPersonId,
        participation: "WITNESS",
      },
    });
    await prisma.$disconnect();
  });

  it("omits profiles and cases outside the actor department", async () => {
    const restricted = await repository.findProfileForActor(
      departmentActor,
      financialPersonId,
    );
    const administratorView = await repository.findProfileForActor(
      administratorActor,
      financialPersonId,
    );

    expect(restricted).toBeNull();
    expect(administratorView?.cases.map((record) => record.firNumber)).toContain("FIR-212");
  });

  it("rejects a cross-department association without revealing the person", async () => {
    await expect(repository.associateWithCase(departmentActor, {
      caseId: cyberCaseId,
      personId: financialPersonId,
      participation: CaseParticipation.Witness,
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("associates one canonical person with another authorized case and audits it", async () => {
    await repository.associateWithCase(administratorActor, {
      caseId: cyberCaseId,
      personId: financialPersonId,
      participation: CaseParticipation.Witness,
      notes: "Synthetic cross-case witness association.",
    });

    const [association, audit] = await Promise.all([
      prisma.casePerson.findFirst({
        where: {
          caseId: cyberCaseId,
          personId: financialPersonId,
          participation: "WITNESS",
        },
      }),
      prisma.auditEvent.findFirst({
        where: {
          action: "CASE_PERSON_ASSOCIATE",
          targetId: financialPersonId,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    expect(association?.notes).toBe("Synthetic cross-case witness association.");
    expect(audit).toMatchObject({ actorId: administratorActor.userId, outcome: "SUCCESS" });
  });
});
