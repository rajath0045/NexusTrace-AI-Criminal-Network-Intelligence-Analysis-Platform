import { z } from "zod";
import {
  IncidentParticipation,
  IncidentStatus,
  IncidentSubmissionStatus,
  IncidentType,
  IncidentVerificationLevel,
} from "./model";

const optionalText = (max: number) => z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(max).optional(),
);

export const incidentInputSchema = z.object({
  incidentNumber: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()),
  incidentType: z.enum(IncidentType),
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(10).max(4_000),
  occurredAt: z.coerce.date(),
  location: optionalText(240),
  caseId: z.preprocess((value) => value === "" ? undefined : value, z.string().uuid().optional()),
  people: z.array(z.object({
    personId: z.string().uuid().optional(),
    graphEntityId: z.string().uuid().optional(),
    participation: z.enum(IncidentParticipation),
    notes: optionalText(1_000),
  }).refine((participant) => Boolean(participant.personId || participant.graphEntityId), {
    message: "Each participant must reference an authorized person or entity.",
  })).max(40).default([]),
  evidenceIds: z.array(z.string().uuid()).max(40).default([]),
});

export const incidentReviewSchema = z.object({
  decision: z.enum([
    IncidentSubmissionStatus.Accepted,
    IncidentSubmissionStatus.Rejected,
    IncidentSubmissionStatus.ChangesRequested,
  ]),
  reason: z.string().trim().min(3).max(1_000),
});

export const incidentVerificationSchema = z.object({
  level: z.enum([
    IncidentVerificationLevel.DepartmentVerified,
    IncidentVerificationLevel.CrossVerified,
  ]),
  reason: z.string().trim().min(3).max(1_000),
});

export const incidentUpdateSchema = incidentInputSchema.omit({ incidentNumber: true }).extend({
  status: z.enum(IncidentStatus).optional(),
});

export const timelineFilterValues = ["ALL", "INCIDENT", "EVIDENCE", "CASE", "RELATIONSHIP"] as const;
export const timelineQuerySchema = z.object({
  personId: z.string().uuid().optional(),
  caseId: z.string().uuid().optional(),
  incidentId: z.string().uuid().optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  types: z.array(z.enum(timelineFilterValues)).max(5).default(["ALL"]),
}).superRefine((value, context) => {
  if (!value.personId && !value.caseId && !value.incidentId) {
    context.addIssue({ code: "custom", message: "A person, case, or incident scope is required." });
  }
  if (value.startTime && value.endTime && value.startTime > value.endTime) {
    context.addIssue({ code: "custom", message: "The timeline start must be before its end." });
  }
});

export type IncidentInput = z.infer<typeof incidentInputSchema>;
export type IncidentReview = z.infer<typeof incidentReviewSchema>;
export type IncidentUpdate = z.infer<typeof incidentUpdateSchema>;
export type TimelineQuery = z.infer<typeof timelineQuerySchema>;

export interface IncidentParticipantView {
  id: string;
  personId: string | null;
  graphEntityId: string | null;
  displayName: string;
  participation: IncidentParticipation;
  notes: string | null;
}

export interface IncidentEvidenceView {
  id: string;
  evidenceId: string;
  originalFilename: string;
  verificationState: string;
  note: string | null;
}

export interface IncidentAuditView {
  id: string;
  action: string;
  outcome: string;
  actorName: string | null;
  createdAt: Date;
}

export interface IncidentSummary {
  id: string;
  incidentNumber: string;
  incidentType: IncidentType;
  title: string;
  occurredAt: Date;
  status: IncidentStatus;
  submissionStatus: IncidentSubmissionStatus;
  verificationLevel: IncidentVerificationLevel;
  departmentName: string;
  caseId: string | null;
  caseFirNumber: string | null;
}

export interface IncidentDetail extends IncidentSummary {
  description: string;
  location: string | null;
  submittedByName: string;
  submittedAt: Date;
  departmentVerifierName: string | null;
  departmentVerifiedAt: Date | null;
  crossVerifierName: string | null;
  crossVerifiedAt: Date | null;
  reviewReason: string | null;
  people: IncidentParticipantView[];
  evidence: IncidentEvidenceView[];
  graphFocusId: string | null;
  audit: IncidentAuditView[];
}

export interface TimelineItem {
  id: string;
  type: Exclude<(typeof timelineFilterValues)[number], "ALL">;
  timestamp: Date;
  title: string;
  description: string;
  sourceRecordType: "INCIDENT" | "EVIDENCE" | "CASE" | "RELATIONSHIP";
  sourceRecordId: string;
  caseId: string | null;
  incidentId: string | null;
  personIds: string[];
  evidenceId: string | null;
}
