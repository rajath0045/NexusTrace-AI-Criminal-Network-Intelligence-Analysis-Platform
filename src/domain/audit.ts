import { z } from "zod";

export const auditQuerySchema = z.object({
  actorId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  action: z.string().trim().min(1).max(100).optional(),
  targetType: z.string().trim().min(1).max(100).optional(),
  relatedRecordId: z.string().uuid().optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
}).refine((value) => !value.startTime || !value.endTime || value.startTime <= value.endTime, {
  message: "The audit start time must be before its end time.",
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;

export interface AuditEventView {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  outcome: string;
  createdAt: Date;
  actor: { id: string; displayName: string; role: string } | null;
  department: { id: string; name: string; code: string } | null;
  relatedCaseId: string | null;
  relatedIncidentId: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AuditEventPage { items: AuditEventView[]; nextCursor: string | null; }
