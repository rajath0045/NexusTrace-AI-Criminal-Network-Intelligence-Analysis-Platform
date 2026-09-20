import { z } from "zod";
import type { Actor } from "@/domain/auth";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { reportGenerationSchema, reportListQuerySchema } from "@/domain/report";
import { assertCan } from "@/server/authorization/policy";
import { PrismaReportRepository } from "@/server/repositories/prisma-report-repository";
import type { ReportRepository } from "@/server/repositories/report-repository";

export class ReportService {
  constructor(private readonly repository: ReportRepository) {}
  async generate(actor: Actor, input: unknown) { assertCan(actor, "CASE_VIEW"); const parsed = reportGenerationSchema.safeParse(input); if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message); return this.repository.generate(actor, parsed.data); }
  async regenerate(actor: Actor, reportId: string) { assertCan(actor, "CASE_VIEW"); if (!z.string().uuid().safeParse(reportId).success) throw new NotFoundError(); const existing = await this.repository.find(actor, reportId); if (!existing) throw new NotFoundError(); return this.repository.generate(actor, { caseId: existing.caseId, incidentId: existing.incidentId ?? undefined, title: existing.title }, reportId); }
  async list(actor: Actor, query: unknown = {}) { assertCan(actor, "CASE_VIEW"); const parsed = reportListQuerySchema.safeParse(query); if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message); return this.repository.list(actor, parsed.data); }
  async get(actor: Actor, reportId: string, version?: number) { assertCan(actor, "CASE_VIEW"); if (!z.string().uuid().safeParse(reportId).success || (version !== undefined && (!Number.isInteger(version) || version < 1))) throw new NotFoundError(); const report = await this.repository.find(actor, reportId, version); if (!report) throw new NotFoundError(); return report; }
}
const reportService = new ReportService(new PrismaReportRepository());
export const generateReport = reportService.generate.bind(reportService);
export const regenerateReport = reportService.regenerate.bind(reportService);
export const listReports = reportService.list.bind(reportService);
export const getReport = reportService.get.bind(reportService);
