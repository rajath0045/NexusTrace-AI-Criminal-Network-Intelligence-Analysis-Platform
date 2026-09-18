// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedSyntheticDemoData } from "../../prisma/seed";
import type { Actor } from "@/domain/auth";
import { UserRole } from "@/domain/model";
import { prisma } from "@/server/db/client";
import { PrismaEvidenceRepository } from "@/server/repositories/prisma-evidence-repository";

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

describe("PrismaEvidenceRepository", () => {
  const repository = new PrismaEvidenceRepository();
  const storageKey = "tests/task-6-evidence.txt";

  beforeAll(async () => {
    await seedSyntheticDemoData();
    await prisma.evidence.deleteMany({ where: { storageKey } });
  });

  afterAll(async () => {
    await prisma.evidence.deleteMany({ where: { storageKey } });
    await prisma.$disconnect();
  });

  it("does not reveal another department's evidence", async () => {
    const foreignEvidenceId = "50000000-0000-4000-8000-000000000002";
    expect(await repository.findForActor(departmentActor, foreignEvidenceId)).toBeNull();
    expect((await repository.findForActor(administratorActor, foreignEvidenceId))?.originalFilename)
      .toBe("synthetic-transaction-ledger.csv");
  });

  it("persists metadata and its audit event transactionally", async () => {
    const created = await repository.create(
      departmentActor,
      "30000000-0000-4000-8000-000000000001",
      {
        originalFilename: "task-6-evidence.txt",
        mediaType: "text/plain",
        byteSize: 18,
        checksumSha256: "3".repeat(64),
        storageKey,
        description: "Synthetic integration fixture.",
      },
    );

    const audit = await prisma.auditEvent.findFirst({
      where: { action: "EVIDENCE_ATTACH", targetId: created.id },
    });
    expect(created.uploadedByName).toBe("Dev Malhotra");
    expect(audit).toMatchObject({ actorId: departmentActor.userId, outcome: "SUCCESS" });
  });
});
