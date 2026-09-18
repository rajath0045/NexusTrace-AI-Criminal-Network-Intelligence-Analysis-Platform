import { z } from "zod";
import type { IncidentVerificationLevel } from "./model";
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
  id: string;
  category: "COMMUNICATION" | "FINANCIAL" | "NETWORK" | "CROSS_CASE";
  title: string;
  detail: string;
  status: "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED";
  supportingRecordIds: string[];
  evidence: InvestigationEvidenceRef[];
  verificationLevels: IncidentVerificationLevel[];
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

export const copilotQuestionSchema = investigationQuerySchema.extend({
  question: z.string().trim().min(3).max(600),
});
