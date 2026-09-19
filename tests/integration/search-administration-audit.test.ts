import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedSyntheticDemoData } from "../../prisma/seed";
import type { Actor } from "@/domain/auth";
import { UserRole } from "@/domain/model";
import { prisma } from "@/server/db/client";
import { PrismaAdministrationRepository } from "@/server/repositories/prisma-administration-repository";
import { PrismaSearchRepository } from "@/server/repositories/prisma-search-repository";
import { PrismaAuditRepository } from "@/server/repositories/prisma-audit-repository";

const administrator: Actor = { userId: "20000000-0000-4000-8000-000000000001", email: "admin@nexustrace.demo", displayName: "Aditi Rao", role: UserRole.Administrator, departmentId: "10000000-0000-4000-8000-000000000001" };
const department: Actor = { userId: "20000000-0000-4000-8000-000000000002", email: "department@nexustrace.demo", displayName: "Dev Malhotra", role: UserRole.DepartmentUser, departmentId: "10000000-0000-4000-8000-000000000002" };
const investigator: Actor = { userId: "20000000-0000-4000-8000-000000000003", email: "investigator@nexustrace.demo", displayName: "Ishaan Sen", role: UserRole.Investigator, departmentId: "10000000-0000-4000-8000-000000000003" };

describe("search, administration, and audit PostgreSQL authorization", () => {
  beforeAll(async () => { await seedSyntheticDemoData(); await prisma.auditEvent.deleteMany({ where: { action: "AUDIT_TEST_RECORD" } }); });
  afterAll(async () => { await prisma.auditEvent.deleteMany({ where: { action: "AUDIT_TEST_RECORD" } }); await seedSyntheticDemoData(); await prisma.$disconnect(); });

  it("returns each authorized search type within a bounded result set and omits other departments", async () => {
    const search = new PrismaSearchRepository();
    const cyber = await search.search(department, { q: "FIR-212" });
    const financial = await search.search(investigator, { q: "FIR-108" });
    const admin = await search.search(administrator, { q: "FIR-212" });
    const people = await search.search(department, { q: "Arjun" });
    const entities = await search.search(department, { q: "KA 01" });
    const incidents = await search.search(investigator, { q: "INC-212" });
    const empty = await search.search(department, { q: "not-a-synthetic-record" });
    expect(cyber.groups.flatMap((group) => group.results)).toEqual([]);
    expect(financial.groups.flatMap((group) => group.results)).toEqual([]);
    expect(admin.groups.flatMap((group) => group.results).some((result) => result.title === "FIR-212")).toBe(true);
    expect(people.groups.find((group) => group.type === "PERSON")?.results.map((result) => result.title)).toContain("Arjun Mehta");
    expect(entities.groups.find((group) => group.type === "ENTITY")?.results.map((result) => result.title)).toContain("KA 01 SYN 108");
    expect(incidents.groups.find((group) => group.type === "INCIDENT")?.results.map((result) => result.title)).toContain("INC-212");
    expect(empty.groups).toEqual([]);
    for (const response of [cyber, financial, admin, people, entities, incidents, empty]) {
      expect(response.groups.every((group) => group.results.length <= 8)).toBe(true);
    }
  });

  it("records a validated administrator role/department change in the immutable audit history", async () => {
    const administration = new PrismaAdministrationRepository();
    await administration.updateUser(administrator, investigator.userId, { role: UserRole.DepartmentUser, departmentId: department.departmentId, active: true });
    const changed = await prisma.user.findUniqueOrThrow({ where: { id: investigator.userId } });
    expect(changed).toMatchObject({ role: "DEPARTMENT_USER", departmentId: department.departmentId, active: true });
    const audits = await new PrismaAuditRepository().list(administrator, { limit: 10, action: "ADMIN_USER_UPDATE" });
    expect(audits.items[0]).toMatchObject({ targetId: investigator.userId, action: "ADMIN_USER_UPDATE", outcome: "SUCCESS" });
    expect(audits.items[0]?.metadata).not.toHaveProperty("passwordHash");
  });

  it("rejects invalid administration changes without creating a privilege-escalation path", async () => {
    const administration = new PrismaAdministrationRepository();
    await expect(administration.updateUser(administrator, administrator.userId, { active: false })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(administration.updateUser(administrator, investigator.userId, { departmentId: "90000000-0000-4000-8000-000000000001" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("filters, paginates, and sanitizes immutable audit records", async () => {
    const [first, second] = await Promise.all([
      prisma.auditEvent.create({ data: { actorId: administrator.userId, departmentId: administrator.departmentId, action: "AUDIT_TEST_RECORD", targetType: "CASE", targetId: "30000000-0000-4000-8000-000000000001", outcome: "SUCCESS", metadata: { caseId: "30000000-0000-4000-8000-000000000001", reason: "Synthetic audit review", before: { status: "OPEN", passwordHash: "must-not-render" }, token: "must-not-render" } } }),
      prisma.auditEvent.create({ data: { actorId: administrator.userId, departmentId: administrator.departmentId, action: "AUDIT_TEST_RECORD", targetType: "CASE", targetId: "30000000-0000-4000-8000-000000000001", outcome: "SUCCESS", metadata: { caseId: "30000000-0000-4000-8000-000000000001", reason: "Synthetic audit pagination", before: { status: "OPEN", passwordHash: "must-not-render" }, token: "must-not-render" } } }),
    ]);
    const audit = new PrismaAuditRepository();
    const page = await audit.list(administrator, { limit: 1, actorId: administrator.userId, departmentId: administrator.departmentId, action: "AUDIT_TEST_RECORD", targetType: "CASE", relatedRecordId: "30000000-0000-4000-8000-000000000001", startTime: new Date("2026-01-01T00:00:00.000Z") });
    expect(page.items).toHaveLength(1); expect(page.nextCursor).not.toBeNull();
    expect(page.items[0]?.metadata).not.toHaveProperty("token");
    expect(page.items[0]?.metadata?.before).not.toHaveProperty("passwordHash");
    const secondPage = await audit.list(administrator, { limit: 1, action: "AUDIT_TEST_RECORD", cursor: page.nextCursor ?? undefined });
    expect(secondPage.items).toHaveLength(1); expect(secondPage.items[0]?.id).not.toBe(page.items[0]?.id);
    const original = await prisma.auditEvent.findUniqueOrThrow({ where: { id: first.id } });
    expect(original.metadata).toMatchObject({ token: "must-not-render" });
    await prisma.auditEvent.deleteMany({ where: { id: { in: [first.id, second.id] } } });
  });

  it("does not accept an inaccessible audit cursor as an oracle", async () => {
    const audit = new PrismaAuditRepository();
    const page = await audit.list(administrator, { limit: 5, cursor: "00000000-0000-4000-8000-000000000099" });
    expect(page).toEqual({ items: [], nextCursor: null });
  });
});
