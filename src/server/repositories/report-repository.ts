import type { Actor } from "@/domain/auth";
import type { ReportDetail, ReportGenerationInput, ReportListQuery, ReportPage } from "@/domain/report";
export interface ReportRepository { generate(actor: Actor, input: ReportGenerationInput, reportId?: string): Promise<ReportDetail>; list(actor: Actor, query: ReportListQuery): Promise<ReportPage>; find(actor: Actor, reportId: string, version?: number): Promise<ReportDetail | null>; }
