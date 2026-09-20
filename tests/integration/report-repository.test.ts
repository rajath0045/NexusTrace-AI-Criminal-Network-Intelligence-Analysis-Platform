import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedSyntheticDemoData } from "../../prisma/seed";
import type { Actor } from "@/domain/auth";
import { UserRole } from "@/domain/model";
import { prisma } from "@/server/db/client";
import { PrismaReportRepository } from "@/server/repositories/prisma-report-repository";

const admin: Actor = { userId: "20000000-0000-4000-8000-000000000001", email: "admin@nexustrace.demo", displayName: "Aditi Rao", role: UserRole.Administrator, departmentId: "10000000-0000-4000-8000-000000000001" };
const cyber: Actor = { userId: "20000000-0000-4000-8000-000000000002", email: "department@nexustrace.demo", displayName: "Dev Malhotra", role: UserRole.DepartmentUser, departmentId: "10000000-0000-4000-8000-000000000002" };
const cyberCase = "30000000-0000-4000-8000-000000000001";
const financialCase = "30000000-0000-4000-8000-000000000002";
const created: string[] = [];
describe("PrismaReportRepository", () => {
  beforeAll(async () => { await seedSyntheticDemoData(); });
  afterAll(async () => { await prisma.report.deleteMany({ where: { id: { in: created } } }); await seedSyntheticDemoData(); await prisma.$disconnect(); });
  it("creates immutable deterministic snapshots with provenance and separate leads", async () => {
    const repository = new PrismaReportRepository(); const report = await repository.generate(cyber, { caseId: cyberCase }); created.push(report.id);
    expect(report.snapshot.case.firNumber).toBe("FIR-108");
    expect(report.snapshot.evidence.length).toBeGreaterThan(0);
    expect(report.sources.some((item) => item.sourceType === "EVIDENCE")).toBe(true);
    expect(report.sources.every((item) => !JSON.stringify(item).includes("storageKey"))).toBe(true);
    const version = await repository.generate(cyber, { caseId: cyberCase }, report.id);
    expect(version.versions.map((item) => item.version)).toEqual([2, 1]);
    expect((await repository.find(cyber, report.id, 1))?.snapshot.generatedAt).toBe(report.snapshot.generatedAt);
  });
  it("does not disclose cross-department reports or source records", async () => {
    const repository = new PrismaReportRepository();
    await expect(repository.generate(cyber, { caseId: financialCase })).rejects.toBeTruthy();
    const report = await repository.generate(admin, { caseId: financialCase }); created.push(report.id);
    expect(await repository.find(cyber, report.id)).toBeNull();
    expect((await repository.find(admin, report.id))?.snapshot.case.firNumber).toBe("FIR-212");
    expect((await repository.list(cyber, { limit: 20 })).items.map((item) => item.id)).not.toContain(report.id);
  });
});
