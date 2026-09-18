import { z } from "zod";
import { CaseParticipation, type CaseStatus, type VerificationState } from "./model";

const optionalNotes = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(1_000).optional(),
);

export const casePersonInputSchema = z.object({
  caseId: z.string().uuid(),
  personId: z.string().uuid(),
  participation: z.enum(CaseParticipation),
  notes: optionalNotes,
});

export type CasePersonInput = z.infer<typeof casePersonInputSchema>;

export interface PersonReference {
  id: string;
  displayName: string;
  aliases: string[];
}

export interface CaseParticipant extends PersonReference {
  associationId: string;
  participation: CaseParticipation;
  notes: string | null;
}

export interface PersonCaseSummary {
  id: string;
  firNumber: string;
  caseNumber: string;
  title: string;
  status: CaseStatus;
  departmentName: string;
  participation: CaseParticipation;
  notes: string | null;
}

export interface PersonEvidenceSummary {
  id: string;
  caseId: string;
  originalFilename: string;
  mediaType: string;
  verificationState: VerificationState;
}

export interface PersonProfile {
  id: string;
  givenName: string;
  familyName: string;
  displayName: string;
  aliases: string[];
  dateOfBirth: Date | null;
  gender: string | null;
  nationality: string | null;
  identityReference: string | null;
  graphFocusId: string | null;
  cases: PersonCaseSummary[];
  evidence: PersonEvidenceSummary[];
}
