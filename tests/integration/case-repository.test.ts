// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedSyntheticDemoData } from "../../prisma/seed";
import { UserRole } from "@/domain/model";
import type { Actor } from "@/domain/auth";
import { prisma } from "@/server/db/client";
import { PrismaCaseRepository } from "@/server/repositories/prisma-case-repository";

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

describe("PrismaCaseRepository", () => {
  const repository = new PrismaCaseRepository();

  beforeAll(async () => {
    await seedSyntheticDemoData();
    await prisma.case.deleteMany({ where: { firNumber: "FIR-TEST-900" } });
  });

  afterAll(async () => {
    await prisma.case.deleteMany({ where: { firNumber: "FIR-TEST-900" } });
    await prisma.$disconnect();
  });

  it("does not return another department's case to a department user", async () => {
    const restrictedCase = await repository.findForActor(
      departmentActor,
      "30000000-0000-4000-8000-000000000002",
    );
    const administratorView = await repository.findForActor(
      administratorActor,
      "30000000-0000-4000-8000-000000000002",
    );

    expect(restrictedCase).toBeNull();
    expect(administratorView?.firNumber).toBe("FIR-212");
  });

  it("creates the case, CASE graph entity, and audit event atomically", async () => {
    const created = await repository.create(departmentActor, {
      firNumber: "FIR-TEST-900",
      caseNumber: "CCU-TEST-900",
      title: "Synthetic repository test case",
      category: "Cyber fraud",
      description: "Created to verify the transactional case workflow.",
      occurrenceLocation: "Bengaluru, Karnataka",
    });

    const [graphEntity, auditEvent] = await Promise.all([
      prisma.graphEntity.findUnique({ where: { caseId: created.id } }),
      prisma.auditEvent.findFirst({
        where: { action: "CASE_CREATE", targetId: created.id },
      }),
    ]);

    expect(graphEntity).toMatchObject({ entityType: "CASE", displayLabel: "FIR-TEST-900" });
    expect(auditEvent).toMatchObject({ actorId: departmentActor.userId, outcome: "SUCCESS" });
  });
});
