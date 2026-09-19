import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/auth";
import { UserRole } from "@/domain/model";
import type { AuditRepository } from "@/server/repositories/audit-repository";
import { AuditService } from "./audit-service";

const administrator: Actor = { userId: "00000000-0000-4000-8000-000000000001", email: "admin@nexustrace.demo", displayName: "Administrator", role: UserRole.Administrator, departmentId: "10000000-0000-4000-8000-000000000001" };
describe("AuditService", () => {
  it("keeps audit review administrator-only and validates temporal filters", async () => {
    const repository: AuditRepository = { list: vi.fn(async () => ({ items: [], nextCursor: null })), options: vi.fn(async () => ({ actors: [], departments: [], actions: [], targetTypes: [] })) };
    const service = new AuditService(repository);
    await expect(service.list({ ...administrator, role: UserRole.Investigator })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.list(administrator, { startTime: "2026-09-03", endTime: "2026-09-02" })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(repository.list).not.toHaveBeenCalled();
  });
});
