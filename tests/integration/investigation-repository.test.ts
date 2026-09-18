// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedSyntheticDemoData } from "../../prisma/seed";
import type { Actor } from "@/domain/auth";
import { UserRole } from "@/domain/model";
import { buildDeterministicAnalysis } from "@/server/investigation/deterministic-analysis";
import { PrismaInvestigationRepository } from "@/server/repositories/prisma-investigation-repository";
import { prisma } from "@/server/db/client";

const actor: Actor = { userId: "20000000-0000-4000-8000-000000000002", email: "department@nexustrace.demo", displayName: "Dev Malhotra", role: UserRole.DepartmentUser, departmentId: "10000000-0000-4000-8000-000000000002" };

describe("PrismaInvestigationRepository", () => {
  beforeAll(async () => { await seedSyntheticDemoData(); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("returns only authorized bounded activity and derives synthetic change leads from persisted records", async () => {
    const context = await new PrismaInvestigationRepository().contextForActor(actor, { personId: "40000000-0000-4000-8000-000000000001", incidentId: "80000000-0000-4000-8000-000000000001", beforeDays: 7, afterDays: 2 });
    expect(context?.activities.every((record) => record.occurredAt >= new Date("2026-08-02") && record.occurredAt <= new Date("2026-08-18T12:00:00.000Z"))).toBe(true);
    const analysis = buildDeterministicAnalysis(context!, 7, 2);
    expect(analysis.findings.map((finding) => finding.id)).toEqual(expect.arrayContaining(["communication-spike", "new-contact", "cross-case:Synthetic handset D-108"]));
    expect(analysis.findings.every((finding) => finding.status === "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED")).toBe(true);
  });

  it("does not reveal a cyber incident context to an investigator scoped to financial intelligence", async () => {
    const financialActor = { ...actor, userId: "20000000-0000-4000-8000-000000000003", role: UserRole.Investigator, departmentId: "10000000-0000-4000-8000-000000000003" };
    await expect(new PrismaInvestigationRepository().contextForActor(financialActor, { personId: "40000000-0000-4000-8000-000000000001", incidentId: "80000000-0000-4000-8000-000000000001", beforeDays: 7, afterDays: 2 })).resolves.toBeNull();
  });
});
