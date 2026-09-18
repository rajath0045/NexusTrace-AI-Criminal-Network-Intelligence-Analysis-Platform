import { z } from "zod";
import { FindingDispositionReason, FindingReviewStatus, type IncidentVerificationLevel } from "./model";
import type { TimelineItem } from "./incident";

export const investigationQuerySchema = z.object({
  personId: z.string().uuid(),
  incidentId: z.string().uuid(),
  beforeDays: z.coerce.number().int().min(1).max(90).default(7),
  afterDays: z.coerce.number().int().min(0).max(30).default(2),
});

export type InvestigationQuery = z.infer<typeof investigationQuerySchema>;

export interface InvestigationEvidenceRef {
  id: string;
  verificationLevel: IncidentVerificationLevel;
}

export interface InvestigationFinding {
  persistentId?: string;
  id: string;
  category: "COMMUNICATION" | "FINANCIAL" | "NETWORK" | "CROSS_CASE";
  title: string;
  detail: string;
  status: "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED";
  supportingRecordIds: string[];
  evidence: InvestigationEvidenceRef[];
  verificationLevels: IncidentVerificationLevel[];
  reviewStatus: FindingReviewStatus;
}

export interface InvestigationMetric {
  label: string;
  value: string;
  detail: string;
}

export interface InvestigationAnalysis {
  person: { id: string; displayName: string };
  incident: { id: string; incidentNumber: string; title: string; occurredAt: Date };
  window: { startTime: Date; endTime: Date; baselineStartTime: Date; baselineEndTime: Date; beforeDays: number; afterDays: number };
  timeline: TimelineItem[];
  findings: InvestigationFinding[];
  communicationMetrics: InvestigationMetric[];
  financialMetrics: InvestigationMetric[];
  networkMetrics: InvestigationMetric[];
  crossCaseMetrics: InvestigationMetric[];
}

export interface CopilotAnswer {
  answer: string;
  supportingRecordIds: string[];
  evidence: InvestigationEvidenceRef[];
  verificationLevels: IncidentVerificationLevel[];
  notice: "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED";
}

export const findingReviewInputSchema = z.object({
  status: z.enum([FindingReviewStatus.UnderReview, FindingReviewStatus.Acknowledged, FindingReviewStatus.NeedsMoreEvidence, FindingReviewStatus.Dismissed, FindingReviewStatus.Escalated]),
  reasonCode: z.enum(FindingDispositionReason),
  note: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().max(2_000).optional()),
});

export const findingQueueQuerySchema = z.object({
  status: z.enum(FindingReviewStatus).optional(),
  category: z.string().trim().max(40).optional(),
  caseId: z.string().uuid().optional(),
  incidentId: z.string().uuid().optional(),
  personId: z.string().uuid().optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
}).refine((value) => !value.startTime || !value.endTime || value.startTime <= value.endTime, { message: "The finding queue start must be before its end." });

export type FindingReviewInput = z.infer<typeof findingReviewInputSchema>;
export type FindingQueueQuery = z.infer<typeof findingQueueQuerySchema>;

export interface FindingReviewView {
  id: string;
  reviewerName: string;
  reviewerRole: string;
  reviewerDepartmentName: string;
  previousStatus: FindingReviewStatus;
  status: FindingReviewStatus;
  reasonCode: FindingDispositionReason;
  note: string | null;
  createdAt: Date;
}

export interface PersistedFindingView extends InvestigationFinding {
  persistentId: string;
  findingKey: string;
  personId: string;
  personName: string;
  incidentId: string;
  incidentNumber: string;
  caseId: string | null;
  caseFirNumber: string | null;
  generatedAt: Date;
  reviews: FindingReviewView[];
}

export const copilotQuestionSchema = investigationQuerySchema.extend({
  question: z.string().trim().min(3).max(600),
});
