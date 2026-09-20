import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/auth";
import { UserRole } from "@/domain/model";
import type { ReportRepository } from "@/server/repositories/report-repository";
import { ReportService } from "./report-service";
const actor: Actor = { userId: "u", email: "u@nexustrace.demo", displayName: "U", role: UserRole.Investigator, departmentId: "d" };
describe("ReportService", () => { it("validates report generation before repository access", async () => { const repository: ReportRepository = { generate: vi.fn(), list: vi.fn(), find: vi.fn() }; const service = new ReportService(repository); await expect(service.generate(actor, { caseId: "invalid" })).rejects.toMatchObject({ code: "VALIDATION" }); expect(repository.generate).not.toHaveBeenCalled(); }); });
