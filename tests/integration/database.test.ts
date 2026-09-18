// @vitest-environment node

import { verify } from "argon2";
import { UserRole } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedSyntheticDemoData } from "../../prisma/seed";
import { prisma } from "@/server/db/client";

describe("PostgreSQL investigation persistence", () => {
  beforeAll(async () => {
    await seedSyntheticDemoData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("persists a case-person relationship and graph entities", async () => {
    const caseRecord = await prisma.case.findUnique({
      where: { firNumber: "FIR-108" },
      include: { people: true },
    });

    expect(caseRecord?.people.length).toBeGreaterThan(0);
    expect(await prisma.graphEntity.count()).toBeGreaterThan(1);
  });

  it("seeds every role with hashed credentials and evidence-backed relationships", async () => {
    const users = await prisma.user.findMany({ orderBy: { role: "asc" } });
    const relationships = await prisma.graphRelationship.findMany({
      where: { verificationState: "VERIFIED" },
      include: { evidence: true },
    });

    expect(new Set(users.map((user) => user.role))).toEqual(
      new Set([
        UserRole.ADMINISTRATOR,
        UserRole.DEPARTMENT_USER,
        UserRole.INVESTIGATOR,
      ]),
    );
    expect(
      await Promise.all(
        users.map((user) => verify(user.passwordHash, "NexusTraceDemo!2026")),
      ),
    ).toEqual([true, true, true]);
    expect(relationships).toHaveLength(4);
    expect(relationships.every((relationship) => relationship.evidence.length > 0)).toBe(
      true,
    );
  });
});
