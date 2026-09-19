import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/auth";
import { UserRole } from "@/domain/model";
import type { AdministrationRepository } from "@/server/repositories/administration-repository";
import { AdministrationService } from "./administration-service";

const administrator: Actor = { userId: "00000000-0000-4000-8000-000000000001", email: "admin@nexustrace.demo", displayName: "Administrator", role: UserRole.Administrator, departmentId: "10000000-0000-4000-8000-000000000001" };
const repository = (): AdministrationRepository => ({ listUsers: vi.fn(async () => ({ items: [], nextCursor: null })), updateUser: vi.fn(), listDepartments: vi.fn(async () => []), governanceSummary: vi.fn(async () => ({ departmentVerifiedIncidents: 0, crossVerifiedIncidents: 0, openIncidentReviews: 0, escalatedFindings: 0 })) });

describe("AdministrationService", () => {
  it("denies non-administrators before any administration repository call", async () => {
    const store = repository();
    await expect(new AdministrationService(store).users({ ...administrator, role: UserRole.DepartmentUser })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(store.listUsers).not.toHaveBeenCalled();
  });

  it("validates a role update before persisting it", async () => {
    const store = repository();
    await expect(new AdministrationService(store).updateUser(administrator, "not-a-uuid", { active: true })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(store.updateUser).not.toHaveBeenCalled();
  });
});
