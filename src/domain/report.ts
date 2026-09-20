import { z } from "zod";

const optionalDate = z.preprocess((value) => value === "" || value === undefined ? undefined : value, z.coerce.date().optional());
export const reportGenerationSchema = z.object({
  caseId: z.string().uuid(),
  incidentId: z.preprocess((value) => value === "" ? undefined : value, z.string().uuid().optional()),
  title: z.string().trim().min(5).max(160).optional(),
  timelineStart: optionalDate,
  timelineEnd: optionalDate,
}).refine((value) => !value.timelineStart || !value.timelineEnd || value.timelineStart <= value.timelineEnd, { message: "The timeline start must be before its end." });

export const reportListQuerySchema = z.object({ cursor: z.string().uuid().optional(), limit: z.coerce.number().int().min(1).max(50).default(20) });
export type ReportGenerationInput = z.infer<typeof reportGenerationSchema>;
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;

export interface ReportSummary { id: string; reportNumber: string; title: string; caseId: string; firNumber: string; departmentName: string; generatedByName: string; generatedAt: Date; version: number; status: "GENERATED"; }
export interface ReportSource { id: string; sourceType: string; sourceId: string; caseId: string | null; incidentId: string | null; evidenceId: string | null; observedAt: Date | null; verificationState: string | null; reviewState: string | null; metadata: Record<string, unknown> | null; }
export interface ReportSnapshot { schemaVersion: 1; generatedAt: string; case: Record<string, unknown>; subjects: Array<Record<string, unknown>>; evidence: Array<Record<string, unknown>>; incidents: Array<Record<string, unknown>>; relationships: Array<Record<string, unknown>>; timeline: Array<Record<string, unknown>>; communications: Array<Record<string, unknown>>; financial: Array<Record<string, unknown>>; findings: { active: Array<Record<string, unknown>>; dismissed: Array<Record<string, unknown>> }; unavailable: string[]; }
export interface ReportDetail extends ReportSummary { incidentId: string | null; createdAt: Date; versions: Array<{ id: string; version: number; generatedAt: Date; generatedByName: string; status: "GENERATED" }>; snapshot: ReportSnapshot; sources: ReportSource[]; }
export interface ReportPage { items: ReportSummary[]; nextCursor: string | null; }
