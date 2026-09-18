import { z } from "zod";
import type { CaseStatus } from "./model";

const optionalDate = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.coerce.date().optional(),
);

export const caseInputSchema = z.object({
  firNumber: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()),
  caseNumber: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()),
  title: z.string().trim().min(5).max(160),
  category: z.string().trim().min(2).max(80),
  occurredAt: optionalDate,
  occurrenceLocation: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().min(10).max(4_000),
});

export type CaseInput = z.infer<typeof caseInputSchema>;

export interface CaseSummary {
  id: string;
  firNumber: string;
  caseNumber: string;
  title: string;
  category: string;
  status: CaseStatus;
  departmentName: string;
  updatedAt: Date;
}

export interface CaseDetail extends CaseSummary {
  description: string;
  occurredAt: Date | null;
  occurrenceLocation: string | null;
  investigatingOfficerName: string | null;
  peopleCount: number;
  evidenceCount: number;
}
